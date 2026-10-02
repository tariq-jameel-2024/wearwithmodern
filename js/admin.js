(() => {
    const adminPassword = '54321';
    const productStorageKey = 'wearwithmodern-catalog-v2';
    const legacyProductStorageKey = 'wearwithmodern-products-v1';
    const orderStorageKey = 'wearwithmodern-orders-v1';
    const cartStorageKey = 'wearwithmodern-cart-v1';
    const lowStockLimit = 5;
    const defaultProductColors = ['Black', 'White', 'Navy'];
    const categoryInfo = {
        clothes: { label: 'Clothes', heading: 'Trending Clothes' },
        shoes: { label: 'Shoes', heading: 'Modern Shoes' },
        watches: { label: 'Watches', heading: 'Luxury & Smart Watches' },
        accessories: { label: 'Accessories', heading: 'Professional Accessories' }
    };
    const focusClasses = 'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';
    const fieldClasses = `mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 ${focusClasses} dark:border-gray-600 dark:bg-gray-900 dark:text-white`;
    const adminModal = document.getElementById('admin-modal');
    const loginForm = document.getElementById('admin-login-form');
    const adminApp = document.getElementById('admin-editor-form');
    const loginError = document.getElementById('admin-login-error');
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const orderModal = document.getElementById('order-modal');
    const orderForm = document.getElementById('order-form');
    const productImageInput = document.getElementById('product-image');
    const productImageFile = document.getElementById('product-image-file');
    const productImagePreview = document.getElementById('product-image-preview');
    const productImageStatus = document.getElementById('product-image-status');
    const orders = readArray(orderStorageKey);
    const cart = readArray(cartStorageKey);
    let products = loadProducts();
    let currentAdminView = 'dashboard';
    let activeDetailProductId = null;
    let activeProductId = null;
    let activeOrderProductId = null;
    let uploadedImageData = '';
    let chartFrame = 0;
    let adminTrigger = null;

    function readArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    }

    function parsePrice(text) {
        return Number(String(text).replace(/^Rs\.\s*/, '').replace(/,/g, '').trim()) || 0;
    }

    function formatPrice(value) {
        return Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
    }

    function validImageSource(value) {
        const source = String(value || '').trim();
        return /^(https?:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(source) ? source : '';
    }

    function createInitialProducts() {
        const initialProducts = [];
        Object.entries(categoryInfo).forEach(([category, info]) => {
            const section = document.getElementById(category);
            section.querySelectorAll('.grid > div').forEach((card, index) => {
                const image = card.querySelector('img');
                const priceElement = Array.from(card.querySelectorAll('p')).find(paragraph => paragraph.textContent.trim().startsWith('Rs.'));
                const descriptionElement = Array.from(card.querySelectorAll('p')).find(paragraph => paragraph !== priceElement);
                initialProducts.push({
                    id: `${category}-${index + 1}`,
                    name: card.querySelector('h3').textContent.trim(),
                    category,
                    price: parsePrice(priceElement.textContent),
                    discount: 0,
                    image: image ? image.getAttribute('src') : '',
                    imageAlt: image ? image.alt : '',
                    description: descriptionElement ? descriptionElement.textContent.trim() : '',
                    sizes: [],
                    colors: [...defaultProductColors],
                    reviews: [],
                    stock: null
                });
            });
        });
        return initialProducts;
    }

    function loadProducts() {
        const defaults = createInitialProducts();
        try {
            const saved = JSON.parse(localStorage.getItem(productStorageKey) || 'null');
            if (Array.isArray(saved)) {
                const savedProducts = saved.filter(product => product && typeof product.name === 'string' && categoryInfo[product.category]).map(product => ({
                    ...product,
                    price: Math.max(0, Number(product.price) || 0),
                    discount: Math.max(0, Math.min(90, Number(product.discount) || 0)),
                    image: validImageSource(product.image),
                    description: String(product.description || ''),
                    sizes: Array.isArray(product.sizes) ? product.sizes : [],
                    colors: Array.isArray(product.colors) && product.colors.length ? product.colors : [...defaultProductColors],
                    reviews: Array.isArray(product.reviews) ? product.reviews : [],
                    stock: product.stock === null || product.stock === '' || product.stock === undefined ? null : Math.max(0, Number(product.stock) || 0)
                }));
                if (!savedProducts.some(product => product.category === 'accessories')) {
                    savedProducts.push(...defaults.filter(product => product.category === 'accessories'));
                }
                return savedProducts;
            }

            const legacy = JSON.parse(localStorage.getItem(legacyProductStorageKey) || '[]');
            if (Array.isArray(legacy)) {
                legacy.forEach((product, index) => {
                    if (!defaults[index] || !product) return;
                    if (typeof product.name === 'string' && product.name.trim()) defaults[index].name = product.name.trim();
                    if (Number.isFinite(Number(product.price)) && Number(product.price) >= 0) defaults[index].price = Number(product.price);
                });
            }
        } catch (error) {
            return defaults;
        }
        return defaults;
    }

    function saveProducts() {
        localStorage.setItem(productStorageKey, JSON.stringify(products));
    }

    function saveOrders() {
        localStorage.setItem(orderStorageKey, JSON.stringify(orders));
    }

    function discountedPrice(product) {
        return Number(product.price) * (1 - Number(product.discount || 0) / 100);
    }

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function appendTag(parent, tag, className, text) {
        const element = makeElement(tag, className, text);
        parent.append(element);
        return element;
    }

    function renderStorefront() {
        Object.keys(categoryInfo).forEach(category => {
            const grid = document.querySelector(`#${category} .grid`);
            const categoryProducts = products.filter(product => product.category === category);
            grid.replaceChildren();

            if (!categoryProducts.length) {
                const empty = makeElement('p', 'col-span-full py-10 text-center text-gray-500 dark:text-gray-400', 'New products coming soon.');
                grid.append(empty);
            }

            categoryProducts.forEach(product => {
                const card = makeElement('article', 'relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 group');
                card.dataset.storeProductId = product.id;
                const imageFrame = makeElement('div', 'relative h-64 overflow-hidden bg-gray-100 dark:bg-gray-900');
                const imageSource = validImageSource(product.image);
                if (imageSource) {
                    const image = makeElement('img', 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105');
                    image.src = imageSource;
                    image.alt = product.imageAlt || product.name;
                    image.loading = 'lazy';
                    image.decoding = 'async';
                    imageFrame.append(image);
                } else {
                    appendTag(imageFrame, 'span', 'flex h-full items-center justify-center text-gray-400', 'Image unavailable');
                }
                if (product.discount > 0) appendTag(imageFrame, 'span', 'absolute left-3 top-3 rounded-sm bg-red-600 px-2 py-1 text-xs font-bold text-white', `${product.discount}% OFF`);
                card.append(imageFrame);

                const details = makeElement('div', 'p-5 text-center');
                appendTag(details, 'h3', 'text-lg font-semibold text-gray-900 dark:text-white', product.name);
                if (product.description) appendTag(details, 'p', 'mt-2 min-h-10 text-sm text-gray-500 dark:text-gray-400', product.description);

                const priceLine = makeElement('p', 'mt-3 font-bold text-xl text-blue-700 dark:text-blue-300');
                if (product.discount > 0) appendTag(priceLine, 'span', 'mr-2 text-sm font-medium text-gray-400 line-through', `Rs. ${formatPrice(product.price)}`);
                priceLine.append(document.createTextNode(`Rs. ${formatPrice(discountedPrice(product))}`));
                details.append(priceLine);

                const options = [];
                if (product.sizes.length) options.push(`Sizes: ${product.sizes.join(', ')}`);
                if (product.colors.length) options.push(`Colors: ${product.colors.join(', ')}`);
                if (options.length) appendTag(details, 'p', 'mt-2 text-xs text-gray-500 dark:text-gray-400', options.join(' · '));
                if (Number.isFinite(product.stock) && product.stock <= lowStockLimit) {
                    appendTag(details, 'p', 'mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300', product.stock ? `Only ${product.stock} left` : 'Out of stock');
                }

                const detailButton = makeElement('button', 'mt-4 w-full rounded-md bg-blue-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500', 'View Details');
                detailButton.type = 'button';
                detailButton.dataset.detailProductId = product.id;
                details.append(detailButton);
                card.append(details);
                grid.append(card);
            });
        });
    }

    function toggleStoreModal(modal, open) {
        modal.classList.toggle('hidden', !open);
        modal.classList.toggle('flex', open);
        modal.setAttribute('aria-hidden', String(!open));
    }

    function renderProductReviews(product) {
        const reviews = Array.isArray(product.reviews) ? product.reviews : [];
        const average = reviews.length ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length : 0;
        const summary = reviews.length ? `${average.toFixed(1)} / 5 · ${reviews.length} review${reviews.length === 1 ? '' : 's'}` : 'No reviews yet';
        document.getElementById('detail-rating').textContent = summary;
        document.getElementById('detail-review-summary').textContent = summary;

        const reviewList = document.getElementById('detail-review-list');
        reviewList.replaceChildren();
        if (!reviews.length) {
            appendTag(reviewList, 'p', 'py-4 text-sm text-gray-500 dark:text-gray-400', 'Be the first to review this product.');
            return;
        }

        reviews.slice().reverse().slice(0, 20).forEach(review => {
            const row = makeElement('article', 'border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800');
            const heading = makeElement('div', 'flex flex-wrap items-center justify-between gap-2');
            appendTag(heading, 'h4', 'text-sm font-semibold', review.name || 'Customer');
            appendTag(heading, 'span', 'text-sm font-semibold text-amber-600 dark:text-amber-300', `${Number(review.rating) || 0} / 5`);
            row.append(heading);
            appendTag(row, 'p', 'mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300', review.text || '');
            reviewList.append(row);
        });
    }

    function openProductDetails(product) {
        activeDetailProductId = product.id;
        document.getElementById('detail-category').textContent = categoryInfo[product.category].label;
        document.getElementById('detail-name').textContent = product.name;
        document.getElementById('detail-description').textContent = product.description || 'A considered choice from Wear with Modern.';
        document.getElementById('detail-price').textContent = `Rs. ${formatPrice(discountedPrice(product))}`;
        const image = document.getElementById('detail-image');
        const imageSource = validImageSource(product.image);
        image.classList.toggle('hidden', !imageSource);
        image.src = imageSource;
        image.alt = product.imageAlt || product.name;

        const options = document.getElementById('detail-options');
        options.replaceChildren();
        const colorControl = makeChoiceSelect('detail-color', 'Color', product.colors);
        if (!product.colors.length) {
            const colorSelect = colorControl.querySelector('select');
            colorSelect.disabled = true;
            colorSelect.options[0].textContent = 'No color options listed';
        }
        options.append(colorControl);
        if (product.sizes.length) options.append(makeChoiceSelect('detail-size', 'Size', product.sizes));

        const quantity = document.getElementById('detail-quantity');
        quantity.value = 1;
        quantity.max = Number.isFinite(product.stock) ? String(Math.min(20, product.stock)) : '20';
        const outOfStock = product.stock === 0;
        document.getElementById('detail-stock').textContent = Number.isFinite(product.stock) ? (outOfStock ? 'Currently out of stock' : `${product.stock} available`) : 'In stock';
        document.getElementById('detail-add-to-cart').disabled = outOfStock;
        document.getElementById('detail-buy-now').disabled = outOfStock;
        document.getElementById('detail-add-to-cart').classList.toggle('opacity-50', outOfStock);
        document.getElementById('detail-buy-now').classList.toggle('opacity-50', outOfStock);
        document.getElementById('detail-cart-status').textContent = '';
        document.getElementById('review-form-status').classList.add('hidden');
        document.getElementById('detail-review-form').reset();
        renderProductReviews(product);
        toggleStoreModal(document.getElementById('product-detail-modal'), true);
        document.getElementById('detail-close').focus();
    }

    function closeProductDetails() {
        toggleStoreModal(document.getElementById('product-detail-modal'), false);
        activeDetailProductId = null;
    }

    function getDetailSelection(product) {
        const quantity = Number(document.getElementById('detail-quantity').value);
        const selection = {
            quantity,
            color: document.getElementById('detail-color')?.value || '',
            size: document.getElementById('detail-size')?.value || ''
        };
        const status = document.getElementById('detail-cart-status');
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || (Number.isFinite(product.stock) && quantity > product.stock)) {
            status.textContent = Number.isFinite(product.stock) ? `Choose a quantity from 1 to ${Math.min(20, product.stock)}.` : 'Choose a quantity from 1 to 20.';
            return null;
        }
        if (product.colors.length && !selection.color) {
            status.textContent = 'Choose a color first.';
            document.getElementById('detail-color').focus();
            return null;
        }
        if (product.sizes.length && !selection.size) {
            status.textContent = 'Choose a size first.';
            document.getElementById('detail-size').focus();
            return null;
        }
        status.textContent = '';
        return selection;
    }

    function saveCart() {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    }

    function renderCart() {
        const count = cart.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
        document.getElementById('store-cart-count').textContent = String(count);
        document.getElementById('store-cart-open').setAttribute('aria-label', `Open shopping cart, ${count} item${count === 1 ? '' : 's'}`);

        const list = document.getElementById('store-cart-list');
        list.replaceChildren();
        let total = 0;
        const validItems = cart.map((item, index) => ({ item, index, product: products.find(product => product.id === item.productId) })).filter(entry => entry.product);
        if (!validItems.length) appendTag(list, 'p', 'py-12 text-center text-sm text-gray-500 dark:text-gray-400', 'Your cart is empty.');

        validItems.forEach(({ item, index, product }) => {
            const lineTotal = discountedPrice(product) * Number(item.quantity || 0);
            total += lineTotal;
            const row = makeElement('article', 'grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:grid-cols-[72px_minmax(0,1fr)_auto]');
            const imageSource = validImageSource(product.image);
            if (imageSource) {
                const image = makeElement('img', 'h-16 w-16 rounded-sm bg-gray-100 object-cover dark:bg-gray-800');
                image.src = imageSource;
                image.alt = '';
                row.append(image);
            } else row.append(makeElement('span', 'flex h-16 w-16 items-center justify-center rounded-sm bg-gray-100 text-xs text-gray-400 dark:bg-gray-800', 'No image'));

            const details = makeElement('div', 'min-w-0');
            appendTag(details, 'h3', 'truncate text-sm font-semibold', product.name);
            const variants = [item.color, item.size].filter(Boolean).join(' · ');
            if (variants) appendTag(details, 'p', 'mt-1 text-xs text-gray-500 dark:text-gray-400', variants);
            appendTag(details, 'p', 'mt-1 text-sm font-semibold', `Rs. ${formatPrice(lineTotal)}`);
            row.append(details);

            const actions = makeElement('div', 'col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center');
            const quantity = makeElement('input', 'w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800');
            quantity.type = 'number';
            quantity.min = '1';
            quantity.max = Number.isFinite(product.stock) ? String(Math.max(1, Math.min(20, product.stock))) : '20';
            quantity.value = String(item.quantity);
            quantity.setAttribute('aria-label', `Quantity for ${product.name}`);
            quantity.dataset.cartQuantity = String(index);
            actions.append(quantity);

            const buttons = makeElement('div', 'flex items-center gap-2');
            const buyButton = makeElement('button', 'text-xs font-semibold text-blue-800 hover:underline dark:text-blue-200', 'Buy Now');
            buyButton.type = 'button';
            buyButton.dataset.cartBuyNow = String(index);
            buttons.append(buyButton);
            const removeButton = makeElement('button', 'rounded-md p-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800', 'Remove');
            removeButton.type = 'button';
            removeButton.dataset.cartRemove = String(index);
            buttons.append(removeButton);
            actions.append(buttons);
            row.append(actions);
            list.append(row);
        });
        document.getElementById('store-cart-total').textContent = `Rs. ${formatPrice(total)}`;
    }

    function addToCart(product, selection) {
        const existing = cart.find(item => item.productId === product.id && item.color === selection.color && item.size === selection.size);
        const nextQuantity = Number(selection.quantity) + Number(existing?.quantity || 0);
        const status = document.getElementById('detail-cart-status');
        if (nextQuantity > 20 || (Number.isFinite(product.stock) && nextQuantity > product.stock)) {
            status.textContent = Number.isFinite(product.stock) ? `Only ${product.stock} items are currently available.` : 'A cart line can contain up to 20 items.';
            return;
        }
        const previousCart = cart.map(item => ({ ...item }));
        if (existing) existing.quantity = nextQuantity;
        else cart.push({ productId: product.id, color: selection.color, size: selection.size, quantity: selection.quantity });
        try {
            saveCart();
            renderCart();
            status.textContent = 'Added to your cart.';
        } catch (error) {
            cart.splice(0, cart.length, ...previousCart);
            status.textContent = 'Could not save the cart in this browser.';
        }
    }

    function submitProductReview(event) {
        event.preventDefault();
        const product = products.find(entry => entry.id === activeDetailProductId);
        if (!product) return;
        const previousReviews = Array.isArray(product.reviews) ? product.reviews : [];
        product.reviews = [...previousReviews, {
            name: document.getElementById('review-name').value.trim(),
            rating: Number(document.getElementById('review-rating').value),
            text: document.getElementById('review-text').value.trim(),
            createdAt: new Date().toISOString()
        }];
        const status = document.getElementById('review-form-status');
        try {
            saveProducts();
            renderProductReviews(product);
            status.textContent = 'Thanks, your review has been added.';
            status.className = 'text-sm font-medium text-green-700 dark:text-green-300 sm:col-span-2';
            document.getElementById('detail-review-form').reset();
        } catch (error) {
            product.reviews = previousReviews;
            status.textContent = 'Could not save your review in this browser.';
            status.className = 'text-sm font-medium text-red-600 sm:col-span-2';
        }
    }

    function closeProductSearch() {
        document.getElementById('product-search-panel').classList.add('hidden');
        document.getElementById('product-search-toggle').setAttribute('aria-expanded', 'false');
    }

    function selectSearchResult(product) {
        closeProductSearch();
        const card = Array.from(document.querySelectorAll('[data-store-product-id]')).find(entry => entry.dataset.storeProductId === product.id);
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        window.setTimeout(() => card.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 1800);
    }

    function renderProductSearch(query) {
        const results = document.getElementById('product-search-results');
        results.replaceChildren();
        const normalizedQuery = query.trim().toLocaleLowerCase();
        if (!normalizedQuery) {
            appendTag(results, 'p', 'px-3 py-4 text-sm text-gray-500 dark:text-gray-400', 'Search by product name, category, size or colour.');
            return;
        }

        const matches = products.filter(product => {
            const searchableText = [
                product.name,
                categoryInfo[product.category].label,
                product.description,
                ...product.sizes,
                ...product.colors
            ].join(' ').toLocaleLowerCase();
            return searchableText.includes(normalizedQuery);
        }).slice(0, 8);

        if (!matches.length) {
            appendTag(results, 'p', 'px-3 py-4 text-sm text-gray-500 dark:text-gray-400', 'No matching products found.');
            return;
        }

        matches.forEach(product => {
            const resultButton = makeElement('button', 'flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800');
            resultButton.type = 'button';
            resultButton.dataset.searchProductId = product.id;
            const imageSource = validImageSource(product.image);
            if (imageSource) {
                const image = makeElement('img', 'h-12 w-12 shrink-0 rounded-sm bg-gray-100 object-cover dark:bg-gray-800');
                image.src = imageSource;
                image.alt = '';
                image.loading = 'lazy';
                resultButton.append(image);
            }
            const details = makeElement('span', 'min-w-0 flex-1');
            appendTag(details, 'span', 'block truncate text-sm font-semibold', product.name);
            const attributes = [categoryInfo[product.category].label, ...product.sizes, ...product.colors].join(' · ');
            appendTag(details, 'span', 'mt-1 block text-xs text-gray-500 dark:text-gray-400', attributes);
            resultButton.append(details);
            appendTag(resultButton, 'span', 'shrink-0 text-sm font-semibold text-blue-800 dark:text-blue-200', `Rs. ${formatPrice(discountedPrice(product))}`);
            results.append(resultButton);
        });
    }

    function setMetric(id, value) {
        document.getElementById(id).textContent = value;
    }

    function renderDashboard() {
        const completedOrders = orders.filter(order => order.status === 'Completed');
        const totalSales = completedOrders.reduce((total, order) => total + Number(order.total || 0), 0);
        const customerCount = new Set(orders.map(order => order.customerPhone).filter(Boolean)).size;
        const pendingOrders = orders.filter(order => order.status === 'Pending').length;
        const lowStockProducts = products.filter(product => Number.isFinite(product.stock) && product.stock <= lowStockLimit);

        setMetric('metric-orders', String(orders.length));
        setMetric('metric-sales', `Rs. ${formatPrice(totalSales)}`);
        setMetric('metric-products', String(products.length));
        setMetric('metric-customers', String(customerCount));
        setMetric('home-metric-orders', String(orders.length));
        setMetric('home-metric-sales', `Rs. ${formatPrice(totalSales)}`);
        setMetric('home-metric-products', String(products.length));
        setMetric('metric-pending-caption', `${pendingOrders} pending`);
        setMetric('metric-low-stock', String(lowStockProducts.length));
        setMetric('metric-low-stock-caption', `${lowStockProducts.length} low stock`);

        const lowStockList = document.getElementById('dashboard-low-stock');
        lowStockList.replaceChildren();
        if (!lowStockProducts.length) {
            appendTag(lowStockList, 'p', 'py-5 text-sm text-gray-500 dark:text-gray-400', 'No low-stock products. Add stock quantities to start tracking.');
        } else {
            lowStockProducts.slice(0, 5).forEach(product => {
                const row = makeElement('div', 'flex items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-700');
                appendTag(row, 'span', 'truncate text-sm font-medium', product.name);
                appendTag(row, 'span', 'shrink-0 rounded-sm bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', product.stock ? `${product.stock} left` : 'Out of stock');
                lowStockList.append(row);
            });
        }

        const recentOrders = document.getElementById('dashboard-recent-orders');
        recentOrders.replaceChildren();
        if (!orders.length) {
            appendTag(recentOrders, 'p', 'py-8 text-center text-sm text-gray-500 dark:text-gray-400', 'No orders have been placed yet.');
        } else {
            orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).forEach(order => {
                const row = makeElement('div', 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-700');
                const customer = makeElement('div', 'min-w-0');
                appendTag(customer, 'p', 'truncate text-sm font-semibold', order.customerName);
                appendTag(customer, 'p', 'truncate text-xs text-gray-500 dark:text-gray-400', `${order.id} · ${order.items[0]?.name || 'Product'}`);
                row.append(customer);
                const status = makeElement('span', `rounded-sm px-2 py-1 text-xs font-semibold ${statusClass(order.status)}`, order.status);
                row.append(status);
                recentOrders.append(row);
            });
        }
        scheduleChartRender();
    }

    function statusClass(status) {
        if (status === 'Completed') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
        if (status === 'Cancelled') return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
        if (status === 'Processing') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    }

    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function scheduleChartRender() {
        window.cancelAnimationFrame(chartFrame);
        chartFrame = window.requestAnimationFrame(renderSalesChart);
    }

    function renderSalesChart() {
        const canvas = document.getElementById('sales-chart');
        if (!canvas || document.querySelector('[data-admin-page="dashboard"]').classList.contains('hidden')) return;
        const width = canvas.clientWidth;
        const height = 250;
        if (!width) return;
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        const context = canvas.getContext('2d');
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        const dates = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return date;
        });
        const values = dates.map(date => orders
            .filter(order => order.status === 'Completed' && dateKey(new Date(order.createdAt)) === dateKey(date))
            .reduce((sum, order) => sum + Number(order.total || 0), 0));
        const maximum = Math.max(...values, 1);
        const left = 44;
        const right = width - 12;
        const top = 14;
        const bottom = height - 34;
        const chartWidth = right - left;
        const chartHeight = bottom - top;
        const dark = document.documentElement.classList.contains('dark');
        const gridColor = dark ? '#334155' : '#e5e7eb';
        const textColor = dark ? '#9ca3af' : '#6b7280';

        context.font = '11px Inter, sans-serif';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        for (let line = 0; line <= 3; line += 1) {
            const y = top + chartHeight * line / 3;
            const amount = maximum * (3 - line) / 3;
            context.strokeStyle = gridColor;
            context.beginPath();
            context.moveTo(left, y);
            context.lineTo(right, y);
            context.stroke();
            context.fillStyle = textColor;
            context.fillText(formatPrice(amount), left - 8, y);
        }

        const points = values.map((value, index) => ({
            x: left + chartWidth * index / (values.length - 1),
            y: bottom - chartHeight * value / maximum
        }));
        const gradient = context.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.24)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
        context.beginPath();
        context.moveTo(points[0].x, bottom);
        points.forEach(point => context.lineTo(point.x, point.y));
        context.lineTo(points[points.length - 1].x, bottom);
        context.closePath();
        context.fillStyle = gradient;
        context.fill();
        context.beginPath();
        points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.strokeStyle = '#2563eb';
        context.lineWidth = 2.5;
        context.lineJoin = 'round';
        context.stroke();

        points.forEach((point, index) => {
            context.beginPath();
            context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
            context.fillStyle = '#ffffff';
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = '#2563eb';
            context.stroke();
            context.fillStyle = textColor;
            context.textAlign = 'center';
            context.textBaseline = 'top';
            context.fillText(dates[index].toLocaleDateString('en', { weekday: 'short' }), point.x, bottom + 12);
        });
    }

    function renderProductList() {
        const list = document.getElementById('admin-products-list');
        const query = document.getElementById('product-search').value.trim().toLowerCase();
        const category = document.getElementById('product-category-filter').value;
        const visibleProducts = products.filter(product => product.name.toLowerCase().includes(query) && (!category || product.category === category));
        list.replaceChildren();
        if (!visibleProducts.length) {
            appendTag(list, 'p', 'py-10 text-center text-sm text-gray-500 dark:text-gray-400', 'No products match this filter.');
            return;
        }

        visibleProducts.forEach(product => {
            const row = makeElement('article', 'grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 border-b border-gray-200 py-4 last:border-0 dark:border-gray-700 sm:grid-cols-[64px_minmax(0,1fr)_auto_auto]');
            const thumbnail = makeElement('div', 'h-14 w-14 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-900 sm:h-16 sm:w-16');
            const imageSource = validImageSource(product.image);
            if (imageSource) {
                const image = makeElement('img', 'h-full w-full object-cover');
                image.src = imageSource;
                image.alt = '';
                image.loading = 'lazy';
                thumbnail.append(image);
            }
            row.append(thumbnail);

            const details = makeElement('div', 'min-w-0');
            appendTag(details, 'p', 'truncate font-semibold', product.name);
            appendTag(details, 'p', 'mt-1 text-xs text-gray-500 dark:text-gray-400', `${categoryInfo[product.category].label} · ${Number.isFinite(product.stock) ? `${product.stock} in stock` : 'Stock not set'}`);
            const variants = [product.sizes.join(', '), product.colors.join(', ')].filter(Boolean).join(' · ');
            if (variants) appendTag(details, 'p', 'mt-1 truncate text-xs text-gray-500 dark:text-gray-400', variants);
            row.append(details);

            const price = makeElement('div', 'col-start-2 text-sm font-semibold sm:col-start-auto');
            appendTag(price, 'p', 'text-blue-700 dark:text-blue-300', `Rs. ${formatPrice(discountedPrice(product))}`);
            if (product.discount) appendTag(price, 'p', 'text-xs text-gray-500', `${product.discount}% discount`);
            row.append(price);

            const actions = makeElement('div', 'col-start-2 flex gap-2 sm:col-start-auto');
            const editButton = makeElement('button', 'rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700', 'Edit');
            editButton.type = 'button';
            editButton.dataset.editProduct = product.id;
            const deleteButton = makeElement('button', 'rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950', 'Delete');
            deleteButton.type = 'button';
            deleteButton.dataset.deleteProduct = product.id;
            actions.append(editButton, deleteButton);
            row.append(actions);
            list.append(row);
        });
    }

    function renderOrdersList() {
        const list = document.getElementById('admin-orders-list');
        list.replaceChildren();
        if (!orders.length) {
            appendTag(list, 'p', 'py-12 text-center text-sm text-gray-500 dark:text-gray-400', 'No orders yet. Customer orders will appear here.');
            return;
        }

        const tableWrap = makeElement('div', 'overflow-x-auto');
        const table = makeElement('table', 'w-full min-w-[720px] text-left text-sm');
        const head = makeElement('thead', 'border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400');
        const headRow = makeElement('tr');
        ['Order', 'Customer', 'Product', 'Total', 'Date', 'Delivery details', 'Status'].forEach(label => appendTag(headRow, 'th', 'px-3 py-3 font-semibold', label));
        head.append(headRow);
        table.append(head);
        const body = makeElement('tbody');
        orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(order => {
            const row = makeElement('tr', 'border-b border-gray-100 last:border-0 dark:border-gray-700');
            appendTag(row, 'td', 'px-3 py-4 font-semibold', order.id);
            const customerCell = makeElement('td', 'px-3 py-4');
            appendTag(customerCell, 'p', 'font-medium', order.customerName);
            appendTag(customerCell, 'p', 'mt-1 text-xs text-gray-500 dark:text-gray-400', order.customerPhone);
            row.append(customerCell);
            const itemNames = order.items.map(item => `${item.name} × ${item.quantity}`).join(', ');
            appendTag(row, 'td', 'max-w-52 px-3 py-4', itemNames);
            appendTag(row, 'td', 'whitespace-nowrap px-3 py-4 font-semibold', `Rs. ${formatPrice(order.total)}`);
            appendTag(row, 'td', 'whitespace-nowrap px-3 py-4 text-gray-500 dark:text-gray-400', new Date(order.createdAt).toLocaleDateString());

            const address = order.shippingAddress || {};
            const deliveryCell = makeElement('td', 'max-w-64 px-3 py-4');
            const addressLines = [address.line1, address.line2, [address.city, address.province, address.postalCode].filter(Boolean).join(', ')].filter(Boolean);
            appendTag(deliveryCell, 'p', 'text-sm', addressLines.join(', ') || 'Address not provided');
            if (address.email) appendTag(deliveryCell, 'p', 'mt-1 text-xs text-gray-500 dark:text-gray-400', address.email);
            if (address.notes) appendTag(deliveryCell, 'p', 'mt-1 text-xs text-gray-500 dark:text-gray-400', `Note: ${address.notes}`);
            row.append(deliveryCell);

            const statusCell = makeElement('td', 'px-3 py-4');
            const statusSelect = makeElement('select', `${fieldClasses} mt-0 min-w-32 py-1.5 text-xs`);
            statusSelect.dataset.orderStatus = order.id;
            ['Pending', 'Processing', 'Completed', 'Cancelled'].forEach(status => {
                const option = makeElement('option', '', status);
                option.value = status;
                option.selected = status === order.status;
                statusSelect.append(option);
            });
            statusCell.append(statusSelect);
            row.append(statusCell);
            body.append(row);
        });
        table.append(body);
        tableWrap.append(table);
        list.append(tableWrap);
    }

    function renderAdmin() {
        renderDashboard();
        renderProductList();
        renderOrdersList();
    }

    function setAdminView(view) {
        if (!['home', 'dashboard', 'products', 'orders'].includes(view)) return;
        currentAdminView = view;
        document.querySelectorAll('[data-admin-page]').forEach(page => page.classList.toggle('hidden', page.dataset.adminPage !== view));
        document.querySelectorAll('[data-admin-view]').forEach(button => {
            const selected = button.dataset.adminView === view;
            button.classList.toggle('bg-blue-50', selected);
            button.classList.toggle('text-blue-900', selected);
            button.classList.toggle('dark:bg-blue-900/30', selected);
            button.classList.toggle('dark:text-blue-200', selected);
            button.setAttribute('aria-current', selected ? 'page' : 'false');
        });
        document.getElementById('admin-page-title').textContent = view === 'home' ? 'Home' : view === 'dashboard' ? 'Dashboard' : view === 'products' ? 'Products' : 'Orders';
        if (view === 'dashboard') scheduleChartRender();
    }

    function updateImagePreview(source) {
        const safeSource = validImageSource(source);
        productImagePreview.replaceChildren();
        if (safeSource) {
            const image = makeElement('img', 'h-full w-full object-cover');
            image.src = safeSource;
            image.alt = 'Product image preview';
            productImagePreview.append(image);
        } else {
            appendTag(productImagePreview, 'span', 'flex h-full items-center justify-center text-xs text-gray-500', 'Preview');
        }
    }

    function openProductEditor(product = null) {
        activeProductId = product ? product.id : null;
        uploadedImageData = '';
        productForm.reset();
        document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
        document.getElementById('product-name').value = product ? product.name : '';
        document.getElementById('product-category').value = product ? product.category : 'clothes';
        document.getElementById('product-price').value = product ? product.price : '';
        document.getElementById('product-discount').value = product ? product.discount : 0;
        document.getElementById('product-description').value = product ? product.description : '';
        document.getElementById('product-sizes').value = product ? product.sizes.join(', ') : '';
        document.getElementById('product-colors').value = product ? product.colors.join(', ') : '';
        document.getElementById('product-stock').value = product && Number.isFinite(product.stock) ? product.stock : '';
        productImageInput.value = product ? product.image : '';
        productImageFile.value = '';
        productImageStatus.textContent = '';
        updateImagePreview(product ? product.image : '');
        productModal.classList.remove('hidden');
        productModal.classList.add('flex');
        document.getElementById('product-name').focus();
    }

    function closeProductEditor() {
        productModal.classList.add('hidden');
        productModal.classList.remove('flex');
    }

    async function compressImage(file) {
        if (!file || !file.type.startsWith('image/')) throw new Error('Choose a valid image file.');
        const objectUrl = URL.createObjectURL(file);
        try {
            const image = new Image();
            image.src = objectUrl;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('This image could not be opened.'));
            });
            const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.82);
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    function splitOptions(value) {
        return Array.from(new Set(value.split(',').map(option => option.trim()).filter(Boolean)));
    }

    function saveProduct(event) {
        event.preventDefault();
        const stockValue = document.getElementById('product-stock').value;
        const image = uploadedImageData || validImageSource(productImageInput.value);
        const product = {
            id: activeProductId || `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: document.getElementById('product-name').value.trim(),
            category: document.getElementById('product-category').value,
            price: Number(document.getElementById('product-price').value),
            discount: Number(document.getElementById('product-discount').value) || 0,
            image,
            imageAlt: document.getElementById('product-name').value.trim(),
            description: document.getElementById('product-description').value.trim(),
            sizes: splitOptions(document.getElementById('product-sizes').value),
            colors: splitOptions(document.getElementById('product-colors').value),
            stock: stockValue === '' ? null : Number(stockValue)
        };

        const existingIndex = products.findIndex(entry => entry.id === activeProductId);
        const previousProducts = products;
        if (!product.colors.length) product.colors = [...defaultProductColors];
        if (existingIndex >= 0) {
            product.reviews = products[existingIndex].reviews || [];
            products = products.map((entry, index) => index === existingIndex ? product : entry);
        } else {
            product.reviews = [];
            products = [...products, product];
        }
        try {
            saveProducts();
            renderStorefront();
            renderAdmin();
            closeProductEditor();
        } catch (error) {
            products = previousProducts;
            document.getElementById('product-form-error').textContent = 'Could not save. The browser may be out of storage space.';
            document.getElementById('product-form-error').classList.remove('hidden');
        }
    }

    function makeChoiceSelect(id, labelText, options) {
        const wrapper = makeElement('div');
        const label = makeElement('label', 'block text-sm font-medium', labelText);
        label.htmlFor = id;
        const select = makeElement('select', fieldClasses);
        select.id = id;
        const defaultOption = makeElement('option', '', 'Select an option');
        defaultOption.value = '';
        select.append(defaultOption);
        options.forEach(value => {
            const option = makeElement('option', '', value);
            option.value = value;
            select.append(option);
        });
        label.append(select);
        wrapper.append(label);
        return wrapper;
    }

    function openOrderForm(product, selection = {}) {
        if (product.stock === 0) return;
        activeOrderProductId = product.id;
        document.getElementById('order-modal-title').textContent = `Order ${product.name}`;
        document.getElementById('order-product-summary').textContent = `${categoryInfo[product.category].label} · Rs. ${formatPrice(discountedPrice(product))}`;
        document.getElementById('order-name').value = '';
        document.getElementById('order-phone').value = '';
        document.getElementById('order-email').value = '';
        document.getElementById('order-address-line1').value = '';
        document.getElementById('order-address-line2').value = '';
        document.getElementById('order-city').value = '';
        document.getElementById('order-province').value = '';
        document.getElementById('order-postal-code').value = '';
        document.getElementById('order-notes').value = '';
        document.getElementById('order-quantity').value = selection.quantity || 1;
        const choices = document.getElementById('order-choices');
        choices.replaceChildren();
        if (product.sizes.length) {
            choices.append(makeChoiceSelect('order-size', 'Size', product.sizes));
            document.getElementById('order-size').value = selection.size || '';
        }
        if (product.colors.length) {
            choices.append(makeChoiceSelect('order-color', 'Color', product.colors));
            document.getElementById('order-color').value = selection.color || '';
        }
        document.getElementById('order-form-error').textContent = '';
        document.getElementById('order-form-error').classList.add('hidden');
        document.getElementById('order-success').textContent = '';
        orderModal.classList.remove('hidden');
        orderModal.classList.add('flex');
        document.getElementById('order-name').focus();
    }

    function closeOrderForm() {
        orderModal.classList.add('hidden');
        orderModal.classList.remove('flex');
        orderForm.reset();
    }

    function placeOrder(event) {
        event.preventDefault();
        const product = products.find(entry => entry.id === activeOrderProductId);
        const error = document.getElementById('order-form-error');
        if (!product) {
            error.textContent = 'This product is no longer available.';
            error.classList.remove('hidden');
            return;
        }

        const quantity = Number(document.getElementById('order-quantity').value);
        if (Number.isFinite(product.stock) && quantity > product.stock) {
            error.textContent = `Only ${product.stock} items are currently in stock.`;
            error.classList.remove('hidden');
            return;
        }

        const item = {
            productId: product.id,
            name: product.name,
            quantity,
            unitPrice: discountedPrice(product),
            size: document.getElementById('order-size')?.value || '',
            color: document.getElementById('order-color')?.value || ''
        };
        const order = {
            id: `WW-${Date.now().toString().slice(-8)}`,
            customerName: document.getElementById('order-name').value.trim(),
            customerPhone: document.getElementById('order-phone').value.trim(),
            shippingAddress: {
                email: document.getElementById('order-email').value.trim(),
                line1: document.getElementById('order-address-line1').value.trim(),
                line2: document.getElementById('order-address-line2').value.trim(),
                city: document.getElementById('order-city').value.trim(),
                province: document.getElementById('order-province').value.trim(),
                postalCode: document.getElementById('order-postal-code').value.trim(),
                notes: document.getElementById('order-notes').value.trim()
            },
            items: [item],
            total: item.unitPrice * quantity,
            status: 'Pending',
            createdAt: new Date().toISOString()
        };
        const previousProducts = products;
        if (Number.isFinite(product.stock)) products = products.map(entry => entry.id === product.id ? { ...entry, stock: entry.stock - quantity } : entry);
        orders.unshift(order);
        try {
            saveProducts();
            saveOrders();
            renderStorefront();
            renderAdmin();
            document.getElementById('order-success').textContent = `Order ${order.id} received. We will contact you to confirm.`;
            document.getElementById('order-success').classList.remove('hidden');
        } catch (saveError) {
            orders.shift();
            products = previousProducts;
            error.textContent = 'Could not save this order in the browser.';
            error.classList.remove('hidden');
        }
    }

    function changeOrderStatus(orderId, newStatus) {
        const order = orders.find(entry => entry.id === orderId);
        if (!order || order.status === newStatus) return;
        const previousStatus = order.status;
        const product = products.find(entry => entry.id === order.items[0]?.productId);
        if (previousStatus === 'Cancelled' && newStatus !== 'Cancelled' && Number.isFinite(product?.stock) && product.stock < order.items[0].quantity) {
            renderOrdersList();
            return;
        }

        if (product && Number.isFinite(product.stock)) {
            const quantity = Number(order.items[0].quantity);
            if (previousStatus !== 'Cancelled' && newStatus === 'Cancelled') product.stock += quantity;
            if (previousStatus === 'Cancelled' && newStatus !== 'Cancelled') product.stock -= quantity;
        }
        order.status = newStatus;
        try {
            saveProducts();
            saveOrders();
            renderStorefront();
            renderAdmin();
        } catch (error) {
            order.status = previousStatus;
        }
    }

    function closeAdminPanel() {
        adminModal.classList.add('hidden');
        adminModal.setAttribute('aria-hidden', 'true');
        loginForm.classList.remove('hidden');
        adminApp.classList.add('hidden');
        adminApp.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
        if (adminTrigger) adminTrigger.focus();
    }

    function openAdminPanel(event) {
        event.preventDefault();
        adminTrigger = event.currentTarget;
        loginForm.reset();
        loginError.classList.add('hidden');
        loginForm.classList.remove('hidden');
        adminApp.classList.add('hidden');
        adminApp.classList.remove('flex');
        adminModal.classList.remove('hidden');
        adminModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');
        document.getElementById('admin-password').focus();
    }

    function signOut() {
        closeAdminPanel();
    }

    document.querySelectorAll('a[href="#admin"]').forEach(link => link.addEventListener('click', openAdminPanel));
    document.getElementById('admin-close').addEventListener('click', closeAdminPanel);
    document.getElementById('admin-logout').addEventListener('click', signOut);
    document.querySelectorAll('[data-admin-view]').forEach(button => button.addEventListener('click', () => setAdminView(button.dataset.adminView)));
    document.getElementById('admin-close-app').addEventListener('click', closeAdminPanel);
        document.querySelectorAll('a[href="#admin"]').forEach(link => link.addEventListener('click', openAdminPanel));
        document.getElementById('admin-close').addEventListener('click', closeAdminPanel);

    const productSearchToggle = document.getElementById('product-search-toggle');
    const productSearchPanel = document.getElementById('product-search-panel');
    const productSearchInput = document.getElementById('product-search-input');
    const productSearchForm = document.getElementById('product-search-form');
    const productSearchResults = document.getElementById('product-search-results');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuPanel = document.getElementById('mobile-menu-panel');
    const mobileMenuIcon = document.getElementById('mobile-menu-icon');
    const mobileSearchTrigger = document.getElementById('mobile-search-trigger');

    function closeMobileMenu() {
        mobileMenuPanel.classList.add('hidden');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.setAttribute('aria-label', 'Open navigation menu');
        mobileMenuIcon.classList.remove('fa-xmark');
        mobileMenuIcon.classList.add('fa-bars');
    }

    mobileMenuToggle.addEventListener('click', () => {
        const opening = mobileMenuPanel.classList.contains('hidden');
        closeProductSearch();
        mobileMenuPanel.classList.toggle('hidden', !opening);
        mobileMenuToggle.setAttribute('aria-expanded', String(opening));
        mobileMenuToggle.setAttribute('aria-label', opening ? 'Close navigation menu' : 'Open navigation menu');
        mobileMenuIcon.classList.toggle('fa-bars', !opening);
        mobileMenuIcon.classList.toggle('fa-xmark', opening);
    });
    mobileMenuPanel.addEventListener('click', event => {
        if (event.target.closest('[data-mobile-nav-link]')) closeMobileMenu();
        if (event.target.closest('#mobile-search-trigger')) {
            closeMobileMenu();
            productSearchToggle.click();
        }
    });

    productSearchToggle.addEventListener('click', () => {
        const opening = productSearchPanel.classList.contains('hidden');
        closeMobileMenu();
        productSearchPanel.classList.toggle('hidden', !opening);
        productSearchToggle.setAttribute('aria-expanded', String(opening));
        if (opening) {
            renderProductSearch(productSearchInput.value);
            productSearchInput.focus();
        }
    });
    document.getElementById('product-search-close').addEventListener('click', () => {
        closeProductSearch();
        productSearchToggle.focus();
    });
    productSearchInput.addEventListener('input', () => renderProductSearch(productSearchInput.value));
    productSearchForm.addEventListener('submit', event => {
        event.preventDefault();
        const firstResult = productSearchResults.querySelector('[data-search-product-id]');
        if (!firstResult) return;
        const product = products.find(entry => entry.id === firstResult.dataset.searchProductId);
        if (product) selectSearchResult(product);
    });
    productSearchResults.addEventListener('click', event => {
        const result = event.target.closest('[data-search-product-id]');
        if (!result) return;
        const product = products.find(entry => entry.id === result.dataset.searchProductId);
        if (product) selectSearchResult(product);
    });
    document.addEventListener('click', event => {
        if (!productSearchPanel.classList.contains('hidden') && !productSearchPanel.contains(event.target) && !productSearchToggle.contains(event.target) && !mobileSearchTrigger.contains(event.target)) closeProductSearch();
        if (!mobileMenuPanel.classList.contains('hidden') && !mobileMenuPanel.contains(event.target) && !mobileMenuToggle.contains(event.target)) closeMobileMenu();
    });

    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        if (document.getElementById('admin-password').value !== adminPassword) {
            loginError.classList.remove('hidden');
            document.getElementById('admin-password').select();
            return;
        }
        loginError.classList.add('hidden');
        loginForm.classList.add('hidden');
        adminApp.classList.remove('hidden');
        adminApp.classList.add('flex');
        setAdminView('home');
        renderAdmin();
        document.getElementById('admin-page-title').focus();
    });

    document.getElementById('admin-add-product').addEventListener('click', () => openProductEditor());
    document.getElementById('product-close').addEventListener('click', closeProductEditor);
    document.getElementById('product-cancel').addEventListener('click', closeProductEditor);
    productForm.addEventListener('submit', saveProduct);
    document.getElementById('product-search').addEventListener('input', renderProductList);
    document.getElementById('product-category-filter').addEventListener('change', renderProductList);

    document.getElementById('admin-products-list').addEventListener('click', event => {
        const editButton = event.target.closest('[data-edit-product]');
        const deleteButton = event.target.closest('[data-delete-product]');
        if (editButton) {
            const product = products.find(entry => entry.id === editButton.dataset.editProduct);
            if (product) openProductEditor(product);
        }
        if (deleteButton) {
            const product = products.find(entry => entry.id === deleteButton.dataset.deleteProduct);
            if (!product || !window.confirm(`Delete ${product.name}?`)) return;
            products = products.filter(entry => entry.id !== product.id);
            saveProducts();
            renderStorefront();
            renderAdmin();
        }
    });

    productImageInput.addEventListener('input', () => {
        uploadedImageData = '';
        productImageStatus.textContent = '';
        updateImagePreview(productImageInput.value);
    });
    productImageFile.addEventListener('change', async () => {
        const file = productImageFile.files[0];
        if (!file) return;
        try {
            uploadedImageData = await compressImage(file);
            productImageInput.value = '';
            productImageStatus.textContent = 'Image ready';
            updateImagePreview(uploadedImageData);
        } catch (error) {
            productImageStatus.textContent = error.message;
        }
    });

    document.getElementById('admin-orders-list').addEventListener('change', event => {
        if (event.target.matches('[data-order-status]')) changeOrderStatus(event.target.dataset.orderStatus, event.target.value);
    });

    document.body.addEventListener('click', event => {
        const detailButton = event.target.closest('[data-detail-product-id]');
        if (detailButton) {
            const product = products.find(entry => entry.id === detailButton.dataset.detailProductId);
            if (product) openProductDetails(product);
            return;
        }
        const orderButton = event.target.closest('[data-order-product-id]');
        if (orderButton) {
            const product = products.find(entry => entry.id === orderButton.dataset.orderProductId);
            if (product) openOrderForm(product);
        }
    });
    document.getElementById('detail-close').addEventListener('click', closeProductDetails);
    document.getElementById('detail-add-to-cart').addEventListener('click', () => {
        const product = products.find(entry => entry.id === activeDetailProductId);
        if (!product) return;
        const selection = getDetailSelection(product);
        if (selection) addToCart(product, selection);
    });
    document.getElementById('detail-buy-now').addEventListener('click', () => {
        const product = products.find(entry => entry.id === activeDetailProductId);
        if (!product) return;
        const selection = getDetailSelection(product);
        if (!selection) return;
        closeProductDetails();
        openOrderForm(product, selection);
    });
    document.getElementById('detail-review-form').addEventListener('submit', submitProductReview);

    const cartModal = document.getElementById('store-cart-modal');
    const closeCart = () => toggleStoreModal(cartModal, false);
    document.getElementById('store-cart-open').addEventListener('click', () => {
        renderCart();
        toggleStoreModal(cartModal, true);
        document.getElementById('store-cart-close').focus();
    });
    document.getElementById('store-cart-close').addEventListener('click', closeCart);
    document.getElementById('store-cart-continue').addEventListener('click', closeCart);
    document.getElementById('store-cart-list').addEventListener('click', event => {
        const removeButton = event.target.closest('[data-cart-remove]');
        if (removeButton) {
            cart.splice(Number(removeButton.dataset.cartRemove), 1);
            saveCart();
            renderCart();
            return;
        }
        const buyButton = event.target.closest('[data-cart-buy-now]');
        if (buyButton) {
            const item = cart[Number(buyButton.dataset.cartBuyNow)];
            const product = products.find(entry => entry.id === item?.productId);
            if (!item || !product) return;
            closeCart();
            openOrderForm(product, item);
        }
    });
    document.getElementById('store-cart-list').addEventListener('change', event => {
        if (!event.target.matches('[data-cart-quantity]')) return;
        const index = Number(event.target.dataset.cartQuantity);
        const item = cart[index];
        const product = products.find(entry => entry.id === item?.productId);
        const quantity = Number(event.target.value);
        if (!item || !product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 || (Number.isFinite(product.stock) && quantity > product.stock)) {
            renderCart();
            return;
        }
        item.quantity = quantity;
        saveCart();
        renderCart();
    });
    document.getElementById('order-close').addEventListener('click', closeOrderForm);
    document.getElementById('order-cancel').addEventListener('click', closeOrderForm);
    orderForm.addEventListener('submit', placeOrder);

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (!productSearchPanel.classList.contains('hidden')) {
            closeProductSearch();
            productSearchToggle.focus();
        } else if (!mobileMenuPanel.classList.contains('hidden')) {
            closeMobileMenu();
            mobileMenuToggle.focus();
        } else if (!document.getElementById('product-detail-modal').classList.contains('hidden')) closeProductDetails();
        else if (!cartModal.classList.contains('hidden')) closeCart();
        else if (!productModal.classList.contains('hidden')) closeProductEditor();
        else if (!orderModal.classList.contains('hidden')) closeOrderForm();
        else if (!adminModal.classList.contains('hidden')) closeAdminPanel();
    });
    window.addEventListener('resize', () => {
        scheduleChartRender();
        if (window.matchMedia('(min-width: 768px)').matches) closeMobileMenu();
    });

    renderStorefront();
    renderCart();
    renderDashboard();
})();