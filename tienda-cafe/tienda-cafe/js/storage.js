const CLAVE_CARRITO = "tueste:carrito";

const guardarCarrito = (carrito) => {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  return carrito;
};

export function obtenerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
  } catch {
    return [];
  }
}

// Guardar: agrega el producto o suma una unidad si ya estaba
export function agregarAlCarrito(idProducto) {
  const carrito = obtenerCarrito();
  const yaExiste = carrito.some(({ id }) => id === idProducto);

  const carritoActualizado = yaExiste
    ? carrito.map((item) => (item.id === idProducto ? { ...item, cantidad: item.cantidad + 1 } : item))
    : [...carrito, { id: idProducto, cantidad: 1 }];

  return guardarCarrito(carritoActualizado);
}

// Modificar: cambia la cantidad de un producto
export function modificarCantidad(idProducto, cantidad) {
  const carritoActualizado = obtenerCarrito().map((item) =>
    item.id === idProducto ? { ...item, cantidad } : item
  );
  return guardarCarrito(carritoActualizado);
}

// Borrar: quita un producto
export function eliminarDelCarrito(idProducto) {
  const carritoActualizado = obtenerCarrito().filter(({ id }) => id !== idProducto);
  return guardarCarrito(carritoActualizado);
}

// Vaciar: limpia todo el storage
export function vaciarCarrito() {
  localStorage.clear();
  return [];
}
