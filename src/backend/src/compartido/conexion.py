import os
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgrado_user:postgrado_dev_password@127.0.0.1:5432/postgrado_dev")

if os.getenv("DB_HOST"):
    DATABASE_URL = make_url(DATABASE_URL).set(
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
    )

engine = create_async_engine(DATABASE_URL, echo=False, hide_parameters=True)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
        
