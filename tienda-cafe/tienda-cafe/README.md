# Tueste — Simulador de compra online

Proyecto final de JavaScript. Tienda de café de especialidad con circuito completo:
catálogo → filtros → carrito → cantidades → cupón → checkout → confirmación.

## Cómo ejecutarlo

Como usa `fetch` para leer los archivos `.json` y módulos ES, **no funciona abriendo `index.html` con doble clic**.
Levantalo con un servidor local:

- VS Code: extensión *Live Server* → "Go Live".
- O con Node: `npx serve .`

## Estructura

```
index.html
css/styles.css
js/api.js       → fetch de los JSON (async/await)
js/storage.js   → localStorage: guardar, modificar, borrar y vaciar
js/app.js       → lógica del simulador y manipulación del DOM
data/           → productos.json y opciones.json (base de datos simulada)
assets/img/     → imágenes de productos
```

## Librerías

Bootstrap 5, SweetAlert2 (confirmaciones) y Toastify (avisos).
