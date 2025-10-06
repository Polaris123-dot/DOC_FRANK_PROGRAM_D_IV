// Mensaje de bienvenida
window.onload = () => {
    alert("Bienvenido a CoffeeTime ☕");
};

document.getElementById("pedidoForm").addEventListener("submit", function(e) {  
    e.preventDefault(); 
    let cliente = document.getElementById("cliente").value;
    let producto = document.getElementById("producto").value;
    let cantidad = document.getElementById("cantidad").value;

    total=producto * cantidad

    document.getElementById("resultado").innerText = 
        `Gracias ${cliente}, el total de tu pedido es: S/ ${total}`;
});