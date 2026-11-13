import { useContext } from "react";
import { UserContext } from "@/shared/context/UserContext";
import { Estadisticas } from "../components/Estadisticas";
import { PeriodoInscripcionCard } from "../components/PeriodoInscripcionCard";

export default function Panel() {
    const currentUser = useContext(UserContext);

    return (
        <>
        <Estadisticas />
        {currentUser.rol === "coordinador" && <PeriodoInscripcionCard cohorteId="c1a2b3c4-0001-0000-0000-000000000003"/>}
        </>
    )
}