export interface Noticia {
    id: string;
    titulo: string;
    categoria: string;
    resumen: string;
    contenido: string;
    fecha_publicacion: string;
    imagen_url: string;
}

export const noticias: Noticia[] = [
    {
        id: "noticas-pruebas",
        titulo: "Noticias de prueba",
        categoria: "Comunicado",
        resumen: "Resumen de la noticia de prueba",
        contenido: "Contenido de la noticia de prueba",
        fecha_publicacion: "2023-06-01",
        imagen_url: "",
    },
];