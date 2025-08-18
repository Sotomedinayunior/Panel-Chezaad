export default function handler(req, res) {
  if (req.method === 'POST' || req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Panel Chezaad</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 30px; }
    table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
    th { background: #0077cc; color: #fff; }
    .status-ok { color: green; }
    .status-off { color: red; }
    .status-error { color: gray; }
    button.ingresar { background-color: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
    button.salir { background-color: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
    #searchInput { margin-bottom: 15px; padding: 8px; width: 300px; border: 1px solid #ccc; border-radius: 4px; }
    .Ponche-Head{
       display:flex;
       justify-content: space-between; 
        align-items: end; 

    }
  </style>
</head>
<body>
 <div class="Ponche-Head">
    <div>
    <img src="../Logo.png" alt="Logo Chezaad" width="200" height="40">
    <p>Mostrando estado de la jornada de todos los empleados activos</p>
  </div>
   <div styles="">
  <input type="text" id="searchInput" placeholder="Buscar por nombre o email..." />
  </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Email</th>
        <th>Estado</th>
        <th>Inicio</th>
        <th>Fin</th>
        <th>Horas trabajadas</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="poncheInfo">
      <tr><td colspan="7">Cargando datos...</td></tr>
    </tbody>
  </table>

  <script>
    const webhookBase = "https://chezaad-nfr.bitrix24.com/rest/435/7ywb7o58ugno9e0t/";

    async function obtenerTodosLosPonches() {
      const poncheInfo = document.getElementById("poncheInfo");
      poncheInfo.innerHTML = "";

      try {
        const res = await fetch(webhookBase + "user.get.json");
        const data = await res.json();
        const empleados = data.result.filter(user => user.ACTIVE === true);

        for (const emp of empleados) {
          let estado = "Sin acceso", inicio = "—", fin = "—", horas = "—";
          let estadoClase = "status-error";
          let accionBtn = "";

          try {
            const statusRes = await fetch(webhookBase + \`timeman.status.json?user_id=\${emp.ID}\`);
            const statusData = await statusRes.json();

            if (statusData.result) {
              const st = statusData.result;

              estado = st.STATUS === "OPENED" ? "En línea" : "Fuera";
              estadoClase = st.STATUS === "OPENED" ? "status-ok" : "status-off";
              inicio = st.TIME_START ? new Date(st.TIME_START).toLocaleTimeString() : "—";
              fin = st.TIME_FINISH ? new Date(st.TIME_FINISH).toLocaleTimeString() : "—";

            if (st.STATUS === "OPENED" && st.TIME_START) {
                const start = new Date(st.TIME_START);
                const now = new Date();
                const diffMs = now - start;
                const diffHrs = diffMs / (1000 * 60 * 60);
                horas = Math.floor(diffHrs) + " hrs"; // Redondea hacia abajo
            } else if (st.DURATION) {
                horas = Math.floor(parseFloat(st.DURATION)) + " hrs"; // Redondea hacia abajo
            }


              accionBtn = st.STATUS === "OPENED"
                ? \`<button class="salir" onclick="marcarPonche('salir', \${emp.ID})">Salir</button>\`
                : \`<button class="ingresar" onclick="marcarPonche('ingresar', \${emp.ID})">Ingresar</button>\`;
            }

            if (statusData.error === "ACCESS_DENIED") {
              estado = "Sin permiso";
              estadoClase = "status-error";
              accionBtn = "—";
            }

          } catch (e) {
            console.warn(\`No se pudo obtener el ponche de \${emp.NAME}:\`, e);
          }

          poncheInfo.innerHTML += \`
            <tr>
              <td>\${emp.NAME} \${emp.LAST_NAME}</td>
              <td>\${emp.EMAIL || '—'}</td>
              <td class="\${estadoClase}">\${estado}</td>
              <td>\${inicio}</td>
              <td>\${fin}</td>
              <td>\${horas}</td>
              <td>\${accionBtn}</td>
            </tr>
          \`;
        }

        if (empleados.length === 0) {
          poncheInfo.innerHTML = \`<tr><td colspan="7">No hay empleados activos para mostrar.</td></tr>\`;
        }

      } catch (error) {
        console.error("Error global:", error);
        poncheInfo.innerHTML = \`<tr><td colspan="7">❌ Error al cargar los datos</td></tr>\`;
      }
    }

    async function marcarPonche(accion, userId) {
      const endpoint = accion === 'ingresar' ? 'timeman.open.json' : 'timeman.close.json';
      const url = \`\${webhookBase}\${endpoint}?user_id=\${userId}\`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        alert(\`✅ Ponche \${accion === 'ingresar' ? 'iniciado' : 'finalizado'} correctamente\`);
        obtenerTodosLosPonches();
      } catch (err) {
        console.error("Error al marcar ponche:", err);
        alert("❌ Error inesperado");
      }
    }

    // Filtro de búsqueda
    document.getElementById("searchInput").addEventListener("input", function() {
      const filter = this.value.toLowerCase();
      const rows = document.querySelectorAll("#poncheInfo tr");
      rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || "";
        const email = row.cells[1]?.textContent.toLowerCase() || "";
        row.style.display = (name.includes(filter) || email.includes(filter)) ? "" : "none";
      });
    });

    obtenerTodosLosPonches();
    setInterval(obtenerTodosLosPonches, 60000);
  </script>
</body>
</html>
    `);
  } else {
    res.status(405).send('Método no permitido');
  }
}
