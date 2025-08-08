export default function handler(req, res) {
  if (req.method === 'GET' || req.method === 'POST') {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Mi Ponche</title>
<script src="https://api.bitrix24.com/api/v1/"></script>
<style>
  body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 30px; display: flex; justify-content: center; }
  .card { background: #fff; border-radius: 8px; padding: 20px; width: 320px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
  .card img { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid #eee; }
  h3 { margin: 6px 0 2px; }
  .estado-ok { color: #28a745; font-weight: bold; }
  .estado-off { color: #dc3545; font-weight: bold; }
  .estado-error { color: gray; font-weight: bold; }
  .info { font-size: 14px; margin: 4px 0; }
  button.ingresar, button.salir { border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; margin-top: 12px; font-weight: 600; }
  button.ingresar { background-color: #28a745; color: white; }
  button.salir { background-color: #dc3545; color: white; }
  .modal { display: none; position: fixed; z-index: 9999; inset: 0; background-color: rgba(0,0,0,0.5); align-items: center; justify-content: center; padding: 16px; }
  .modal-content { background: #fff; padding: 51px 20px 16px; border-radius: 8px; max-width: 480px; width: 100%; }
  .modal-header { font-weight: 700; font-size: 18px; margin-bottom: 8px; }
  .modal-sub { color: #555; font-size: 14px; margin-bottom: 10px; }
  .modal-content textarea { width: 100%; height: 110px; margin: 6px 0 8px; padding: 10px; resize: vertical; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; }
  .btn-cancel { background: #6c757d; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
  .btn-send { background: #dc3545; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; }
  .small { font-size: 12px; color: #777; margin-top: 6px; }
</style>
</head>
<body>

<div id="cardContainer"><p>Cargando datos...</p></div>

<!-- Modal de reporte -->
<div id="modalSalida" class="modal" aria-hidden="true">
  <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal-header" id="modalTitle">Confirmar salida</div>
    <div class="modal-sub">Antes de salir, escribe un breve reporte de tus actividades.</div>
    <textarea id="reporteSalida" placeholder="Escribe tu reporte aquí..."></textarea>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="cerrarModal()">Cancelar</button>
      <button class="btn-send" onclick="enviarSalida()">Enviar reporte y salir</button>
    </div>
    <div class="small">Este reporte se enviará de forma privada a los supervisores.</div>
  </div>
</div>

<script>
  // Configura a quién enviar el reporte (IDs de usuarios o grupo)
  const SUPERVISOR_IDS = ['1'];      // cambia esto
  const SUPERVISOR_GROUP_ID = '';    // opcional

  let usuarioActual = null; // {ID, NAME, LAST_NAME, EMAIL, PERSONAL_PHOTO}

  function toTime(t) {
    try { return t ? new Date(t).toLocaleTimeString() : '—'; } catch(e) { return '—'; }
  }
  function esUrl(str){ return typeof str === 'string' && /^https?:\\/\\//i.test(str); }

  function pintarCard(estado, estadoClase, inicio, fin, horas, foto, nombreCompleto, abierto) {
    const container = document.getElementById("cardContainer");
    const boton = abierto
      ? '<button class="salir" onclick="abrirModal()">Salir</button>'
      : '<button class="ingresar" onclick="marcarEntrada()">Ingresar</button>';
    container.innerHTML = \`
      <div class="card">
        <img src="\${foto}" alt="Foto">
        <h3>\${nombreCompleto}</h3>
        <div class="\${estadoClase}">\${estado}</div>
        <p class="info">Inicio: \${inicio}</p>
        <p class="info">Fin: \${fin}</p>
        <p class="info">Horas: \${horas}</p>
        \${boton}
      </div>\`;
  }

  function abrirModal() {
    document.getElementById("modalSalida").style.display = "flex";
    document.getElementById("reporteSalida").value = "";
    document.getElementById("reporteSalida").focus();
  }
  function cerrarModal() {
    document.getElementById("modalSalida").style.display = "none";
  }

  function cargarEstado() {
    BX24.callMethod('timeman.status', {}, function(res) {
      if (res.error()) {
        console.error(res.error());
        document.getElementById("cardContainer").innerHTML = "<p>❌ Error al leer estado</p>";
        return;
      }
      const st = res.data();
      const abierto = st.STATUS === "OPENED";
      const estado = abierto ? "En línea" : "Fuera";
      const estadoClase = abierto ? "estado-ok" : "estado-off";
      const inicio = toTime(st.TIME_START);
      const fin = toTime(st.TIME_FINISH);
      let horas = "—";
      if (abierto && st.TIME_START) {
        const diffHrs = (new Date() - new Date(st.TIME_START)) / 36e5;
        horas = Math.floor(diffHrs) + " hrs";
      } else if (st.DURATION) {
        horas = Math.floor(parseFloat(st.DURATION)) + " hrs";
      }
      const foto = esUrl(usuarioActual.PERSONAL_PHOTO) ? usuarioActual.PERSONAL_PHOTO : 'https://via.placeholder.com/88';
      const nombreCompleto = \`\${usuarioActual.NAME || ''} \${usuarioActual.LAST_NAME || ''}\`;

      pintarCard(estado, estadoClase, inicio, fin, horas, foto, nombreCompleto, abierto);
    });
  }

  function marcarEntrada() {
    BX24.callMethod('timeman.open', {}, function(res) {
      if (res.error()) { alert("❌ No se pudo marcar entrada"); return; }
      cargarEstado();
    });
  }

  function enviarSalida() {
    const reporte = (document.getElementById("reporteSalida").value || "").trim();
    if (!reporte) { alert("Por favor escribe un reporte antes de salir."); return; }

    // 1) Enviar reporte privado (vía log.blogpost.add)
    const titulo = \`Reporte de salida - \${usuarioActual.NAME} \${usuarioActual.LAST_NAME}\`.trim();
    const mensaje = \`🕒 Reporte generado al marcar salida\\n\\n\${reporte}\\n\\n— Usuario: \${usuarioActual.NAME} \${usuarioActual.LAST_NAME} (\${usuarioActual.EMAIL || ''})\`;

    const params = { POST_TITLE: titulo, POST_MESSAGE: mensaje, SPERM: {} };
    if (SUPERVISOR_IDS.length) params.SPERM['U'] = SUPERVISOR_IDS.map(String);
    if (SUPERVISOR_GROUP_ID) params.SPERM['SG'] = [String(SUPERVISOR_GROUP_ID)];

    BX24.callMethod('log.blogpost.add', params, function(r1) {
      if (r1.error()) { console.error(r1.error()); alert("❌ No se pudo enviar el reporte."); return; }

      // 2) Cerrar jornada
      BX24.callMethod('timeman.close', {}, function(r2) {
        if (r2.error()) { console.error(r2.error()); alert("El reporte se envió, pero no se pudo marcar la salida."); return; }
        cerrarModal();
        alert("✅ Reporte enviado y salida marcada");
        cargarEstado();
      });
    });
  }

  // Init
  BX24.init(function () {
    // Traer usuario actual
    BX24.callMethod('user.current', {}, function (res) {
      if (res.error()) {
        console.error(res.error());
        document.getElementById("cardContainer").innerHTML = "<p>❌ Error al obtener el usuario</p>";
        return;
      }
      usuarioActual = res.data();
      cargarEstado();
    });
  });
</script>

</body>
</html>`);
  } else {
    res.status(405).send('Método no permitido');
  }
}
