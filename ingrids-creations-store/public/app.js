let cart = [];

// Fetch products from server
fetch("/products")
  .then(res => res.json())
  .then(products => {
    if (document.getElementById("product-list")) {
        const list = document.getElementById("product-list");
        products.forEach(p => {
            const div = document.createElement("div");
            div.innerHTML = `
                <h2>${p.name} - $${p.basePrice}</h2>
                <img src="${p.image}" width="150"/>
                <p>Colors: ${p.colors.join(", ")}</p>
                <a href="product.html?id=${p.id}">Select</a>
                <hr/>
            `;
            list.appendChild(div);
        });
    }

    // Single product page
    if (document.getElementById("product-page")) {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        const product = products.find(p => p.id === id);
        if (!product) return;

        const div = document.getElementById("product-page");
        div.innerHTML = `
            <h2>${product.name} - $${product.basePrice}</h2>
            <img src="${product.image}" width="200"/>
            <label>Choose color:</label>
            <select id="colorSelect">${product.colors.map(c=>`<option>${c}</option>`).join("")}</select>
            <label>Quantity:</label>
            <input type="number" id="quantitySelect" value="1" min="1"/>
            <button id="addToCart">Add to Cart</button>
        `;

        document.getElementById("addToCart").addEventListener("click", () => {
            const color = document.getElementById("colorSelect").value;
            const quantity = parseInt(document.getElementById("quantitySelect").value);
            cart.push({ id: product.id, name: product.name, color, quantity, price: product.basePrice });
            localStorage.setItem("cart", JSON.stringify(cart));
            alert("Added to cart!");
        });
    }
  });

// Load cart on cart page
if (document.getElementById("cart-items")) {
    cart = JSON.parse(localStorage.getItem("cart")) || [];
    const container = document.getElementById("cart-items");

    function renderCart() {
        container.innerHTML = "";
        cart.forEach((item,i) => {
            const div = document.createElement("div");
            div.innerHTML = `
                <p>${item.name} - ${item.color} x${item.quantity} - $${item.price*item.quantity}</p>
                <button onclick="removeItem(${i})">Remove</button>
            `;
            container.appendChild(div);
        });
        updateTotal();
    }

    function removeItem(index) {
        cart.splice(index,1);
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
    }

    function updateTotal(discountPercent=0) {
        let total = cart.reduce((sum,i)=>sum+i.price*i.quantity,0);
        if (discountPercent>0) total = total * (1-discountPercent/100);
        document.getElementById("totalPrice").innerText = `Total: $${total.toFixed(2)}`;
    }

    renderCart();

    window.applyDiscount = () => {
        const code = document.getElementById("discountCode").value;
        fetch("/apply-discount", {
            method:"POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({code})
        })
        .then(res=>res.json())
        .then(data=>{
            if (data.valid) {
                alert(`Discount applied: ${data.discountPercent}% off`);
                updateTotal(data.discountPercent);
            } else {
                alert("Invalid discount code");
            }
        });
    }

    // PayPal Buttons
    paypal.Buttons({
        createOrder: (data, actions) => {
            let total = cart.reduce((sum,i)=>sum+i.price*i.quantity,0);
            return actions.order.create({ purchase_units:[{amount:{value: total.toFixed(2)}}]});
        },
        onApprove: (data, actions) => {
            return actions.order.capture().then(details=>{
                const email = details.payer.email_address || prompt("Enter your email for confirmation:");
                fetch("/complete-order", {
                    method:"POST",
                    headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ items: cart, email, total: cart.reduce((sum,i)=>sum+i.price*i.quantity,0) })
                })
                .then(res=>res.json())
                .then(resp=>{
                    if(resp.success){
                        alert("Order completed! Confirmation sent to your email.");
                        cart=[];
                        localStorage.setItem("cart", JSON.stringify(cart));
                        window.location.href = "/";
                    } else {
                        alert("Error: "+resp.message);
                    }
                });
            });
        }
    }).render('#paypal-button-container');
}
