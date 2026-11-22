import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import PiePagina from "../src/shared/componentes/PiePagina/PiePagina";

const configuracion = {
  direccion: "Calle 60 y 124, La Plata",
  telefono: "+54 221 4277270",
  email: "posgrado@example.com",
  horario: "Lunes a viernes de 9 a 18 hs",
  facebook: "https://www.facebook.com/utn",
  instagram: "https://www.instagram.com/utn",
  linkedin: "",
  youtube: "",
};

describe("Pie de página público", () => {
  it("muestra la dirección y el horario configurados", () => {
    render(
      <PiePagina
        configuracion={configuracion}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.getByText(configuracion.direccion, {
        exact: false,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(configuracion.horario)
    ).toBeInTheDocument();
  });

  it("genera correctamente el enlace telefónico", () => {
    render(
      <PiePagina
        configuracion={configuracion}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.getByRole("link", {
        name: configuracion.telefono,
      })
    ).toHaveAttribute("href", "tel:+542214277270");
  });

  it("genera correctamente el enlace de correo", () => {
    render(
      <PiePagina
        configuracion={configuracion}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.getByRole("link", {
        name: configuracion.email,
      })
    ).toHaveAttribute(
      "href",
      `mailto:${configuracion.email}`
    );
  });

  it("muestra únicamente las redes sociales configuradas", () => {
    render(
      <PiePagina
        configuracion={configuracion}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.getByRole("link", {
        name: "Facebook",
      })
    ).toHaveAttribute(
      "href",
      configuracion.facebook
    );

    expect(
      screen.getByRole("link", {
        name: "Instagram",
      })
    ).toHaveAttribute(
      "href",
      configuracion.instagram
    );

    expect(
      screen.queryByRole("link", {
        name: "LinkedIn",
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("link", {
        name: "YouTube",
      })
    ).not.toBeInTheDocument();
  });

  it("no muestra enlaces inseguros", () => {
    render(
      <PiePagina
        configuracion={{
          ...configuracion,
          facebook: "javascript:alert(1)",
          instagram: "ftp://example.com",
        }}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.queryByRole("link", {
        name: "Facebook",
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("link", {
        name: "Instagram",
      })
    ).not.toBeInTheDocument();
  });

  it("abre las redes externas de forma segura", () => {
    render(
      <PiePagina
        configuracion={configuracion}
        cargando={false}
        error=""
      />
    );

    const enlace = screen.getByRole("link", {
      name: "Facebook",
    });

    expect(enlace).toHaveAttribute(
      "target",
      "_blank"
    );

    expect(enlace).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
  });

  it("muestra un mensaje durante la carga", () => {
    render(
      <PiePagina
        configuracion={{}}
        cargando={true}
        error=""
      />
    );

    expect(
      screen.getByRole("status")
    ).toHaveTextContent(
      "Cargando información de contacto..."
    );
  });

  it("informa cuando falla la carga", () => {
    render(
      <PiePagina
        configuracion={{}}
        cargando={false}
        error="No se pudo cargar la información de contacto."
      />
    );

    expect(
      screen.getByRole("alert")
    ).toHaveTextContent(
      "No se pudo cargar la información de contacto."
    );
  });

  it("maneja los datos faltantes sin generar enlaces vacíos", () => {
    render(
      <PiePagina
        configuracion={{}}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.getByText("Dirección no disponible", {
        exact: false,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Correo no disponible")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Redes sociales no disponibles."
      )
    ).toBeInTheDocument();

    expect(
      screen.queryAllByRole("link")
    ).toHaveLength(0);
  });

  it("actualiza los datos cuando cambia la configuración", () => {
    const { rerender } = render(
      <PiePagina
        configuracion={configuracion}
        cargando={false}
        error=""
      />
    );

    rerender(
      <PiePagina
        configuracion={{
          ...configuracion,
          direccion: "Nueva dirección institucional",
          email: "nuevo@example.com",
        }}
        cargando={false}
        error=""
      />
    );

    expect(
      screen.getByText(
        "Nueva dirección institucional",
        { exact: false }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: "nuevo@example.com",
      })
    ).toHaveAttribute(
      "href",
      "mailto:nuevo@example.com"
    );

    expect(
      screen.queryByRole("link", {
        name: configuracion.email,
      })
    ).not.toBeInTheDocument();
  });
});