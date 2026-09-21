import { cargarProductos, cargarOpciones } from "./api.js";
import {
  obtenerCarrito,
  agregarAlCarrito,
  modificarCantidad,
  eliminarDelCarrito,
  vaciarCarrito,
} from "./storage.js";

const estado = {
  productos: [],
  cupones: [],
  metodosEnvio: [],
  metodosPago: [],
  carrito: [],
  cuponAplicado: null,
  envioSeleccionado: null,
};

const elementos = {
  vistas: document.querySelectorAll("[data-vista]"),
  cargando: document.querySelector("#indicador-carga"),
  errorCarga: document.querySelector("#error-carga"),
  mensajeError: document.querySelector("#mensaje-error"),
  botonReintentar: document.querySelector("#boton-reintentar"),
  buscador: document.querySelector("#buscador"),
  filtroCategoria: document.querySelector("#filtro-categoria"),
  ordenPrecio: document.querySelector("#orden-precio"),
  catalogo: document.querySelector("#catalogo"),
  contadorCarrito: document.querySelector("#contador-carrito"),
  listaCarrito: document.querySelector("#lista-carrito"),
  resumenCarrito: document.querySelector("#resumen-carrito"),
  formularioCupon: document.querySelector("#formulario-cupon"),
  inputCupon: document.querySelector("#input-cupon"),
  botonVaciar: document.querySelector("#boton-vaciar"),
  botonCheckout: document.querySelector("#boton-checkout"),
  formularioPedido: document.querySelector("#formulario-pedido"),
  opcionesEnvio: document.querySelector("#opciones-envio"),
  selectorPago: document.querySelector("#selector-pago"),
  resumenCheckout: document.querySelector("#resumen-checkout"),
  botonVolver: document.querySelector("#boton-volver"),
  detallePedido: document.querySelector("#detalle-pedido"),
  botonNuevaCompra: document.querySelector("#boton-nueva-compra"),
};

const formatearPrecio = (valor) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(valor);

/* ---------- Librerías: Toastify y SweetAlert2 ---------- */

function notificar(mensaje, tipo = "exito") {
  const fondo = tipo === "error" ? "#9C3B2E" : "#16302B";
  Toastify({ text: mensaje, duration: 2500, gravity: "bottom", position: "right", style: { background: fondo } }).showToast();
}

async function pedirConfirmacion(titulo, texto, textoConfirmar) {
  const { isConfirmed } = await Swal.fire({
    title: titulo,
    text: texto,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16302B",
  });
  return isConfirmed;
}

/* ---------- Vistas ---------- */

function mostrarVista(nombreVista) {
  elementos.vistas.forEach((vista) => {
    vista.classList.toggle("d-none", vista.dataset.vista !== nombreVista);
  });
  window.scrollTo({ top: 0 });
}

/* ---------- Catálogo ---------- */

function obtenerProductosVisibles() {
  const texto = elementos.buscador.value.trim().toLowerCase();
  const categoria = elementos.filtroCategoria.value;
  const orden = elementos.ordenPrecio.value;

  const filtrados = estado.productos.filter(({ nombre, origen, categoria: categoriaProducto }) => {
    const coincideCategoria = categoria === "todas" || categoriaProducto === categoria;
    const coincideTexto = `${nombre} ${origen}`.toLowerCase().includes(texto);
    return coincideCategoria && coincideTexto;
  });

  const ordenadores = {
    menor: (primero, segundo) => primero.precio - segundo.precio,
    mayor: (primero, segundo) => segundo.precio - primero.precio,
  };
  return ordenadores[orden] ? [...filtrados].sort(ordenadores[orden]) : filtrados;
}

function crearTarjetaProducto({ id, nombre, origen, precio, stock, imagen, descripcion }) {
  const { cantidad = 0 } = estado.carrito.find((item) => item.id === id) || {};
  const agotado = cantidad >= stock;

  return `
    <article class="col-sm-6 col-xl-4">
      <div class="producto h-100">
        <img src="${imagen}" alt="${nombre}, ${origen}" class="producto-imagen" loading="lazy">
        <div class="producto-cuerpo">
          <p class="producto-origen">${origen}</p>
          <h3 class="producto-nombre">${nombre}</h3>
          <p class="producto-descripcion">${descripcion}</p>
          <div class="producto-pie">
            <div>
              <span class="producto-precio">${formatearPrecio(precio)}</span>
              <small class="d-block text-muted">${stock - cantidad} disponibles</small>
            </div>
            <button class="btn btn-tueste" data-accion="agregar" data-id="${id}" ${agotado ? "disabled" : ""}>
              ${agotado ? "Sin stock" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </article>`;
}

function renderizarCatalogo() {
  const productosVisibles = obtenerProductosVisibles();

  if (productosVisibles.length === 0) {
    elementos.catalogo.innerHTML = `
      <div class="col-12"><p class="estado-vacio">No encontramos productos con esa búsqueda. Probá con otro nombre o cambiá el filtro.</p></div>`;
    return;
  }
  elementos.catalogo.innerHTML = productosVisibles.map(crearTarjetaProducto).join("");
}

/* ---------- Carrito ---------- */

function obtenerItemsDetallados() {
  return estado.carrito
    .filter(({ id }) => estado.productos.some((producto) => producto.id === id))
    .map(({ id, cantidad }) => ({ ...estado.productos.find((producto) => producto.id === id), cantidad }));
}

function calcularTotales() {
  const subtotal = obtenerItemsDetallados().reduce((acumulado, { precio, cantidad }) => acumulado + precio * cantidad, 0);
  const { descuento: porcentaje = 0 } = estado.cuponAplicado || {};
  const descuento = Math.round((subtotal * porcentaje) / 100);
  const { costo: costoEnvio = 0 } = estado.envioSeleccionado || {};
  return { subtotal, descuento, costoEnvio, total: subtotal - descuento + costoEnvio };
}

function crearFilaCarrito({ id, nombre, precio, cantidad, stock }) {
  return `
    <li class="fila-carrito">
      <div class="fila-info">
        <strong>${nombre}</strong>
        <small>${formatearPrecio(precio)} c/u</small>
      </div>
      <div class="control-cantidad" role="group" aria-label="Cantidad de ${nombre}">
        <button class="btn btn-cantidad" data-accion="restar" data-id="${id}" aria-label="Restar una unidad">−</button>
        <span>${cantidad}</span>
        <button class="btn btn-cantidad" data-accion="sumar" data-id="${id}" aria-label="Sumar una unidad" ${cantidad >= stock ? "disabled" : ""}>+</button>
      </div>
      <strong class="fila-subtotal">${formatearPrecio(precio * cantidad)}</strong>
      <button class="btn btn-quitar" data-accion="quitar" data-id="${id}" aria-label="Quitar ${nombre}">Quitar</button>
    </li>`;
}

function crearLineasTotales({ subtotal, descuento, costoEnvio, total }, incluirEnvio) {
  const { codigo = "" } = estado.cuponAplicado || {};
  return `
    <dl class="totales">
      <div><dt>Subtotal</dt><dd>${formatearPrecio(subtotal)}</dd></div>
      ${descuento > 0 ? `<div><dt>Cupón ${codigo}</dt><dd>− ${formatearPrecio(descuento)}</dd></div>` : ""}
      ${incluirEnvio ? `<div><dt>Envío</dt><dd>${costoEnvio === 0 ? "Sin costo" : formatearPrecio(costoEnvio)}</dd></div>` : ""}
      <div class="total-final"><dt>Total</dt><dd>${formatearPrecio(total)}</dd></div>
    </dl>`;
}

function renderizarCarrito() {
  const items = obtenerItemsDetallados();
  const cantidadTotal = items.reduce((acumulado, { cantidad }) => acumulado + cantidad, 0);
  const carritoVacio = items.length === 0;

  elementos.contadorCarrito.textContent = cantidadTotal;
  elementos.listaCarrito.innerHTML = carritoVacio
    ? `<li class="estado-vacio">Tu carrito está vacío. Elegí un café para empezar.</li>`
    : items.map(crearFilaCarrito).join("");

  elementos.resumenCarrito.innerHTML = carritoVacio ? "" : crearLineasTotales(calcularTotales(), false);
  elementos.botonCheckout.disabled = carritoVacio;
  elementos.botonVaciar.disabled = carritoVacio;
  elementos.formularioCupon.classList.toggle("d-none", carritoVacio);
}

function actualizarInterfaz() {
  renderizarCatalogo();
  renderizarCarrito();
}

function agregarProducto(idProducto) {
  const producto = estado.productos.find(({ id }) => id === idProducto);
  const { cantidad = 0 } = estado.carrito.find(({ id }) => id === idProducto) || {};

  if (!producto || cantidad >= producto.stock) {
    notificar("Ya tenés todo el stock disponible de este producto", "error");
    return;
  }
  estado.carrito = agregarAlCarrito(idProducto);
  notificar(`${producto.nombre} agregado al carrito`);
  actualizarInterfaz();
}

function cambiarCantidad(idProducto, variacion) {
  const { cantidad } = estado.carrito.find(({ id }) => id === idProducto);
  const nuevaCantidad = cantidad + variacion;

  estado.carrito = nuevaCantidad < 1 ? eliminarDelCarrito(idProducto) : modificarCantidad(idProducto, nuevaCantidad);
  actualizarInterfaz();
}

function quitarProducto(idProducto) {
  estado.carrito = eliminarDelCarrito(idProducto);
  notificar("Producto quitado del carrito");
  actualizarInterfaz();
}

async function vaciarTodoElCarrito() {
  const confirmado = await pedirConfirmacion("¿Vaciar el carrito?", "Se van a quitar todos los productos.", "Sí, vaciar");
  if (!confirmado) return;

  estado.carrito = vaciarCarrito();
  estado.cuponAplicado = null;
  notificar("Carrito vaciado");
  actualizarInterfaz();
}

function aplicarCupon(evento) {
  evento.preventDefault();
  const codigoIngresado = elementos.inputCupon.value.trim().toUpperCase();
  const cupon = estado.cupones.find(({ codigo }) => codigo === codigoIngresado);

  if (!cupon) {
    notificar("Ese cupón no existe o está vencido", "error");
    return;
  }
  estado.cuponAplicado = cupon;
  elementos.inputCupon.value = "";
  notificar(`Cupón aplicado: ${cupon.descripcion}`);
  renderizarCarrito();
}

/* ---------- Checkout ---------- */

function renderizarOpcionesCheckout() {
  elementos.opcionesEnvio.innerHTML = estado.metodosEnvio
    .map(
      ({ id, nombre, costo, plazo }, indice) => `
      <label class="opcion-envio">
        <input type="radio" name="envio" value="${id}" ${indice === 0 ? "checked" : ""}>
        <span><strong>${nombre}</strong><small>${plazo}</small></span>
        <span>${costo === 0 ? "Sin costo" : formatearPrecio(costo)}</span>
      </label>`
    )
    .join("");

  elementos.selectorPago.innerHTML = estado.metodosPago.map((metodo) => `<option>${metodo}</option>`).join("");
}

function crearListadoResumen(items) {
  const filas = items
    .map(({ nombre, cantidad, precio }) => `<li><span>${cantidad} × ${nombre}</span><span>${formatearPrecio(cantidad * precio)}</span></li>`)
    .join("");
  return `<ul class="lista-resumen">${filas}</ul>`;
}

function actualizarResumenCheckout() {
  elementos.resumenCheckout.innerHTML = crearListadoResumen(obtenerItemsDetallados()) + crearLineasTotales(calcularTotales(), true);
}

function seleccionarEnvio() {
  const idSeleccionado = elementos.formularioPedido.elements.envio.value;
  estado.envioSeleccionado = estado.metodosEnvio.find(({ id }) => id === idSeleccionado) || null;
  actualizarResumenCheckout();
}

function irAlCheckout() {
  seleccionarEnvio();
  mostrarVista("checkout");
}

function validarFormulario({ nombre, email, direccion }) {
  const errores = {};
  if (nombre.length < 3) errores.nombre = "Ingresá tu nombre completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.email = "Ingresá un email válido, por ejemplo nombre@correo.com.";
  if (direccion.length < 5) errores.direccion = "Ingresá una dirección de entrega.";
  return errores;
}

function mostrarErroresFormulario(errores) {
  ["nombre", "email", "direccion"].forEach((campo) => {
    const input = elementos.formularioPedido.elements[campo];
    const mensaje = document.querySelector(`#error-${campo}`);
    input.classList.toggle("is-invalid", Boolean(errores[campo]));
    mensaje.textContent = errores[campo] || "";
  });
}

async function confirmarPedido(evento) {
  evento.preventDefault();
  const { nombre, email, direccion, pago } = elementos.formularioPedido.elements;
  const cliente = { nombre: nombre.value.trim(), email: email.value.trim(), direccion: direccion.value.trim() };

  const errores = validarFormulario(cliente);
  mostrarErroresFormulario(errores);
  if (Object.keys(errores).length > 0) {
    notificar("Revisá los campos marcados", "error");
    return;
  }

  const { total } = calcularTotales();
  const confirmado = await pedirConfirmacion("¿Confirmar el pedido?", `Vas a pagar ${formatearPrecio(total)}.`, "Confirmar pedido");
  if (!confirmado) return;

  const pedido = {
    numero: `TU-${Date.now().toString().slice(-6)}`,
    cliente,
    pago: pago.value,
    envio: estado.envioSeleccionado,
    items: obtenerItemsDetallados(),
    totales: calcularTotales(),
    cupon: estado.cuponAplicado,
  };

  mostrarConfirmacion(pedido);

  estado.carrito = vaciarCarrito();
  estado.cuponAplicado = null;
  estado.envioSeleccionado = null;
  elementos.formularioPedido.reset();
  actualizarInterfaz();
}

function mostrarConfirmacion({ numero, cliente, pago, envio, items, totales }) {
  elementos.detallePedido.innerHTML = `
    <p class="numero-pedido">Pedido ${numero}</p>
    <p>Enviamos el comprobante a <strong>${cliente.email}</strong>. ${envio.nombre} a ${cliente.direccion} (${envio.plazo.toLowerCase()}). Pago: ${pago.toLowerCase()}.</p>
    ${crearListadoResumen(items)}
    ${crearLineasTotales(totales, true)}`;
  mostrarVista("confirmacion");
}

/* ---------- Eventos ---------- */

function manejarAccionesDeProducto(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const idProducto = Number(boton.dataset.id);
  const acciones = {
    agregar: () => agregarProducto(idProducto),
    sumar: () => cambiarCantidad(idProducto, 1),
    restar: () => cambiarCantidad(idProducto, -1),
    quitar: () => quitarProducto(idProducto),
  };
  acciones[boton.dataset.accion]?.();
}

function registrarEventos() {
  [elementos.catalogo, elementos.listaCarrito].forEach((contenedor) =>
    contenedor.addEventListener("click", manejarAccionesDeProducto)
  );
  [elementos.buscador, elementos.filtroCategoria, elementos.ordenPrecio].forEach((control) =>
    control.addEventListener("input", renderizarCatalogo)
  );
  elementos.formularioCupon.addEventListener("submit", aplicarCupon);
  elementos.botonVaciar.addEventListener("click", vaciarTodoElCarrito);
  elementos.botonCheckout.addEventListener("click", irAlCheckout);
  elementos.botonVolver.addEventListener("click", () => {
    estado.envioSeleccionado = null;
    mostrarVista("tienda");
    renderizarCarrito();
  });
  elementos.opcionesEnvio.addEventListener("change", seleccionarEnvio);
  elementos.formularioPedido.addEventListener("submit", confirmarPedido);
  elementos.botonNuevaCompra.addEventListener("click", () => mostrarVista("tienda"));
  elementos.botonReintentar.addEventListener("click", iniciarAplicacion);
}

/* ---------- Inicio ---------- */

async function iniciarAplicacion() {
  elementos.errorCarga.classList.add("d-none");
  elementos.cargando.classList.remove("d-none");

  try {
    const [productos, opciones] = await Promise.all([cargarProductos(), cargarOpciones()]);
    const { cupones, metodosEnvio, metodosPago } = opciones;

    Object.assign(estado, { productos, cupones, metodosEnvio, metodosPago, carrito: obtenerCarrito() });
    renderizarOpcionesCheckout();
    actualizarInterfaz();
    mostrarVista("tienda");
  } catch (error) {
    elementos.mensajeError.textContent = `${error.message || "Error desconocido"}. Revisá tu conexión o que los archivos JSON estén en su lugar.`;
    elementos.errorCarga.classList.remove("d-none");
    mostrarVista("error");
  } finally {
    elementos.cargando.classList.add("d-none");
  }
}

registrarEventos();
iniciarAplicacion();
