async function obtenerJson(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${ruta} (error ${respuesta.status})`);
  }
  return respuesta.json();
}

export const cargarProductos = () => obtenerJson("data/productos.json");
export const cargarOpciones = () => obtenerJson("data/opciones.json");
