import { useEffect, useState } from "react";
 
function TestLegajos() {
  const [data, setData] = useState<unknown>(null);
  const [data2, setData2] = useState<unknown>(null);
  const [data3, setData3] = useState<unknown>(null);
 
  useEffect(() => {
    fetch("/api/v1/legajos")
      .then((res) => res.json())
      .then((json) => {
        console.log("legajos recibidos:", json);
        setData(json);
      })
      .catch((err) => console.error("fetch legajos falló:", err));

      fetch("/api/v1/cohortes")
      .then((res) => res.json())
      .then((json) => {
        console.log("cohortes recibidos:", json);
        setData2(json);
      })
      .catch((err) => console.error("fetch cohortes falló:", err));

      fetch("/api/v1/seminarios")
      .then((res) => res.json())
      .then((json) => {
        console.log("seminarios recibidos:", json);
        setData3(json);
      })
      .catch((err) => console.error("fetch seminarios falló:", err));
  }, []);
 
  return <pre>{JSON.stringify(data, null, 2)}{JSON.stringify(data2, null, 2)}{JSON.stringify(data3, null, 2)}</pre>;
}

export default TestLegajos
