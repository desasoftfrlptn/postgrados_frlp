from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.authentication.application.security import (
    DUMMY_PASSWORD_HASH,
    create_token_pair,
    get_current_user,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from src.authentication.infrastructure.models import User
from src.authentication.presentation.schemas import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    UserResponse,
)
from src.db.session import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    session: Session = Depends(get_db),
) -> LoginResponse:
    email = str(credentials.email).strip().lower()
    user = session.scalar(select(User).where(User.email == email))
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    valid_password = verify_password(credentials.password, password_hash)
    if user is None or not valid_password or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, refresh_token, expires_in = create_token_pair(session, user)
    session.commit()
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=UserResponse(id=user.id, email=user.email, role=user.role),
    )


@router.post("/refresh", response_model=LoginResponse)
def refresh(
    credentials: RefreshTokenRequest,
    session: Session = Depends(get_db),
) -> LoginResponse:
    user, access_token, refresh_token, expires_in = rotate_refresh_token(
        session,
        credentials.refresh_token,
    )
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=UserResponse(id=user.id, email=user.email, role=user.role),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: RefreshTokenRequest,
    session: Session = Depends(get_db),
) -> Response:
    revoke_refresh_token(session, credentials.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
def current_user(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, role=user.role)
