const defaultApiBase = 'http://127.0.0.1:5050/api/v1';
const state = {
  apiBase: localStorage.getItem('productosApiBase') || defaultApiBase,
  page: 1,
  limit: 20,
  totalPages: 0,
  products: [],
  editingId: null,
};

const apiInput = document.querySelector('#api-url');
const notice = document.querySelector('#notice');
const form = document.querySelector('#product-form');
const productList = document.querySelector('#product-list');
const pageInfo = document.querySelector('#page-info');
const previousButton = document.querySelector('#previous-page');
const nextButton = document.querySelector('#next-page');
const searchInput = document.querySelector('#search');
const submitButton = document.querySelector('#submit-product');
const cancelButton = document.querySelector('#cancel-edit');

apiInput.value = state.apiBase;

function showNotice(message, kind = 'success') {
  notice.textContent = message;
  notice.dataset.kind = kind;
  notice.hidden = false;
}

function clearNotice() {
  notice.hidden = true;
  notice.textContent = '';
}

function getApiBase() {
  let url;
  try {
    url = new URL(apiInput.value.trim());
  } catch {
    throw new Error('Escribe una URL válida para la API.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('La URL de la API debe usar HTTP o HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('La URL de la API no debe incluir credenciales, parámetros ni fragmentos.');
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

async function request(path = '', options = {}) {
  const base = getApiBase();
  let response;
  try {
    response = await fetch(`${base}/productos${path}`, options);
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend esté iniciado y que CORS permita http://localhost:5173.');
  }

  if (response.status === 204) return null;
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`La API respondió con un formato inesperado (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const message = payload?.error?.message || `La solicitud falló (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function formatPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    : String(value);
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  let imageUrl;
  try {
    const parsedUrl = new URL(product.URLImagen);
    if (['http:', 'https:'].includes(parsedUrl.protocol)) imageUrl = parsedUrl.href;
  } catch {
    imageUrl = undefined;
  }

  const image = document.createElement('img');
  image.className = 'product-image';
  image.alt = `Imagen de ${product.nombre}`;
  if (imageUrl) image.src = imageUrl;
  else image.hidden = true;
  image.addEventListener('error', () => {
    image.hidden = true;
    const fallback = createTextElement('div', 'product-image product-image-fallback', '◇');
    fallback.setAttribute('aria-hidden', 'true');
    image.replaceWith(fallback);
  }, { once: true });
  card.append(image);

  const details = document.createElement('div');
  details.className = 'product-details';
  details.append(
    createTextElement('h3', 'product-title', product.nombre),
    createTextElement('p', 'product-description', product.descripcion),
  );
  const meta = document.createElement('div');
  meta.className = 'product-meta';
  meta.append(
    createTextElement('span', 'product-price', `PVP ${formatPrice(product.pvp)}`),
    createTextElement('span', '', `Stock: ${product.stock}`),
    createTextElement('span', '', `ID: ${product.ID}`),
  );
  details.append(meta);
  card.append(details);

  const actions = document.createElement('div');
  actions.className = 'product-actions';
  const editButton = createTextElement('button', 'button button-secondary', 'Editar');
  editButton.type = 'button';
  editButton.addEventListener('click', () => beginEdit(product));
  const deleteButton = createTextElement('button', 'button button-secondary button-danger', 'Eliminar');
  deleteButton.type = 'button';
  deleteButton.addEventListener('click', () => deleteProduct(product));
  actions.append(editButton, deleteButton);
  card.append(actions);
  return card;
}

function renderProducts() {
  productList.replaceChildren();
  const query = searchInput.value.trim().toLocaleLowerCase();
  const products = state.products.filter(product =>
    `${product.nombre} ${product.descripcion} ${product.ID}`.toLocaleLowerCase().includes(query),
  );

  if (!products.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const title = createTextElement('strong', '', query ? 'No hay coincidencias' : 'Aún no hay productos');
    const description = createTextElement('span', '', query ? 'Prueba con otro término de búsqueda.' : 'Agrega un producto para comenzar tu catálogo.');
    empty.append(title, description);
    productList.append(empty);
    return;
  }
  productList.append(...products.map(createProductCard));
}

async function loadProducts() {
  productList.replaceChildren(createTextElement('div', 'empty-state loading', 'Cargando productos…'));
  previousButton.disabled = true;
  nextButton.disabled = true;
  clearNotice();

  try {
    const payload = await request(`?page=${state.page}&limit=${state.limit}`);
    state.products = payload.data;
    state.totalPages = payload.pagination.totalPages;
    if (state.totalPages > 0 && state.page > state.totalPages) {
      state.page = state.totalPages;
      return loadProducts();
    }
    renderProducts();
    const pageCount = Math.max(state.totalPages, 1);
    pageInfo.textContent = `${payload.pagination.total} producto${payload.pagination.total === 1 ? '' : 's'} · Página ${state.page} de ${pageCount}`;
    previousButton.disabled = state.page <= 1;
    nextButton.disabled = state.totalPages === 0 || state.page >= state.totalPages;
    return true;
  } catch (error) {
    state.products = [];
    state.totalPages = 0;
    renderProducts();
    pageInfo.textContent = '';
    showNotice(error.message, 'error');
    return false;
  }
}

function readForm() {
  const formData = new FormData(form);
  const pvp = String(formData.get('pvp')).trim();
  const stock = Number(formData.get('stock'));
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(pvp) || Number(pvp) > 99999999.99) {
    throw new Error('El precio debe ser un número mayor o igual a cero con hasta dos decimales.');
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647) {
    throw new Error('Las existencias deben ser un número entero entre 0 y 2147483647.');
  }
  return {
    nombre: String(formData.get('nombre')).trim(),
    descripcion: String(formData.get('descripcion')).trim(),
    URLImagen: String(formData.get('URLImagen')).trim(),
    pvp,
    stock,
  };
}

function resetForm() {
  form.reset();
  state.editingId = null;
  document.querySelector('#form-title').textContent = 'Agregar producto';
  submitButton.textContent = 'Guardar producto';
  cancelButton.hidden = true;
  clearNotice();
}

function beginEdit(product) {
  state.editingId = product.ID;
  form.elements.namedItem('nombre').value = product.nombre;
  form.elements.namedItem('descripcion').value = product.descripcion;
  form.elements.namedItem('URLImagen').value = product.URLImagen;
  form.elements.namedItem('pvp').value = product.pvp;
  form.elements.namedItem('stock').value = product.stock;
  document.querySelector('#form-title').textContent = 'Editar producto';
  submitButton.textContent = 'Guardar cambios';
  cancelButton.hidden = false;
  clearNotice();
  form.elements.namedItem('nombre').focus();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  submitButton.disabled = true;
  try {
    const product = readForm();
    const editing = state.editingId !== null;
    await request(editing ? `/${encodeURIComponent(state.editingId)}` : '', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    resetForm();
    const refreshed = await loadProducts();
    if (refreshed) showNotice(editing ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
  } catch (error) {
    showNotice(error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

async function deleteProduct(product) {
  if (!window.confirm(`¿Eliminar "${product.nombre}" del catálogo?`)) return;
  try {
    await request(`/${encodeURIComponent(product.ID)}`, { method: 'DELETE' });
    if (await loadProducts()) showNotice('Producto eliminado correctamente.');
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

document.querySelector('#save-api').addEventListener('click', () => {
  try {
    state.apiBase = getApiBase();
    apiInput.value = state.apiBase;
    localStorage.setItem('productosApiBase', state.apiBase);
    state.page = 1;
    loadProducts();
  } catch (error) {
    showNotice(error.message, 'error');
  }
});

cancelButton.addEventListener('click', resetForm);
previousButton.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    loadProducts();
  }
});
nextButton.addEventListener('click', () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    loadProducts();
  }
});
searchInput.addEventListener('input', renderProducts);
loadProducts();
