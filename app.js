import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, getDocs, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDrRjbO6RwIwmew-dZTAx6kFhP9Pm_2ll8",
    authDomain: "stock-b185d.firebaseapp.com",
    projectId: "stock-b185d",
    storageBucket: "stock-b185d.appspot.com",
    messagingSenderId: "693655688921",
    appId: "1:693655688921:web:8d2c08253f45f1448090c8",
    measurementId: "G-SZG4HYLJMZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let productStockTotal = {};
let productCurrentStockDetail = {};
let productStockDetail = {};
let oldProduct = '';
let maindivDate = document.getElementById('maindivDate')
let stockDivHolder = document.getElementById('stockDivHolder')
let maindivNote = document.getElementById('maindivNote')
window.updateDate = updateDate;
window.loadFromFirestore = loadFromFirestore;
window.addProduct = addProduct;
window.coming = coming;
window.going = going;
window.displayProduct = displayProduct;
window.filterStock = filterStock;
window.filterDateTransactions = filterDateTransactions;
window.calculateBalanceForProduct = calculateBalanceForProduct;
window.loadNotesFromFirestore = loadNotesFromFirestore;
window.filterNoteTransactions = filterNoteTransactions;

updateDate();
loadFromFirestore();
async function loadFromFirestore() {
    const snapshot = await getDocs(collection(db, 'products'));
    products = []; // Clear existing products to avoid duplicates
    productStockTotal = {};
    productCurrentStockDetail = {};
    productStockDetail = {};

    document.getElementById('comingProduct').innerHTML = '';
    document.getElementById('goingProduct').innerHTML = '';
    document.getElementById('productSelect').innerHTML = `<option selected disabled value="">Select the product to view details</option>`;
    document.getElementById('stockTableBody').innerHTML = ''; // Clear the stock table

    snapshot.forEach(doc => {
        const data = doc.data();
        const productName = data.name;
        if (!products.includes(productName)) { // Ensure no duplicates
            products.push(productName);
            productStockTotal[productName] = data.stockTotal || 0;

            // Ensure that currentStockDetail is initialized as an empty array
            productCurrentStockDetail[productName] = Array.isArray(data.currentStockDetail) ? data.currentStockDetail : [];
            productStockDetail[productName] = data.stockDetail || [];

            updateUIAfterAddingProduct(productName);
            renderStockDetails(productName); // Load stock details after loading products
        }
    });

}


async function saveToFirestore() {
    const batch = writeBatch(db);
    products.forEach(product => {
        const docRef = doc(db, 'products', product);
        batch.set(docRef, {
            name: product,
            stockTotal: productStockTotal[product],
            currentStockDetail: productCurrentStockDetail[product],
            stockDetail: productStockDetail[product]
        });
    });
    await batch.commit();
}

function displayProduct() {
    maindivDate.style.display = 'none'
    maindivNote.style.display = 'none'
    if (oldProduct) {
        document.getElementById(oldProduct + 'StockDiv').hidden = true;
    }
    const currentProduct = document.getElementById('productSelect').value;
    if (currentProduct) {
        document.getElementById(currentProduct + 'StockDiv').hidden = false;
        oldProduct = currentProduct;
    }
}
window.refresh = refresh
function refresh (){
    location.reload()
}

function validateInputs(productName, qty, price) {
    if (!productName || !qty || !price) {
        alert('All fields must be filled out!');
        return false;
    }
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
        alert('Quantity and price must be positive numbers!');
        return false;
    }
    return true;
}

async function addProduct() {
    const productName = document.getElementById('addProductInput').value.trim();
    if (!productName) {
        alert('Product name cannot be empty');
        return false;
    }

    if (products.includes(productName)) {
        alert('Product already exists');
        return false;
    }

    products.push(productName);
    productStockTotal[productName] = 0;
    productCurrentStockDetail[productName] = [];
    productStockDetail[productName] = [];

    await saveToFirestore();
    updateUIAfterAddingProduct(productName);
    document.getElementById('addProductInput').value = '';
}

function updateUIAfterAddingProduct(productName) {
    const comingProduct = document.getElementById('comingProduct');
    const goingProduct = document.getElementById('goingProduct');
    const stockTableBody = document.getElementById('stockTableBody');
    const stockDiv = document.getElementById('stockDiv');
    const productSelect = document.getElementById('productSelect');

    comingProduct.innerHTML += `<option>${productName}</option>`;
    goingProduct.innerHTML += `<option>${productName}</option>`;
    productSelect.innerHTML += `<option>${productName}</option>`;

    stockTableBody.innerHTML += `<tr><td>${productName}</td><td class="text-right" id="${productName}StockTd">${productStockTotal[productName]}</td></tr>`;

    const itemStockDivHtml = `
        <div hidden id="${productName}StockDiv" class="itemStockDiv">
            <h2 class="productNameH2">${productName}</h2>
            <h2 class="productStockH2" id="${productName}StockHeading">Stock: ${productStockTotal[productName]}</h2>
            <table>
                
                    <tr>
                        <th  class="samecolor"   rowspan="2" style="min-width:85px;">Date</th>
                        <th  class="samecolor"  rowspan="2" style="min-width:152px;">Name</th>
                        <th  class="samecolor"  colspan = "2">In</th>
                        <th  class="samecolor"  colspan = "2">Out</th>
                        <th  class="samecolor"  rowspan="2" style="min-width:152px;">Balance</th>
                    </tr>
                <tr>  
                <th  class="samecolor" >Rate</th>
                <th  class="samecolor" >Qty</th>
                <th  class="samecolor" >Rate</th>
                <th  class="samecolor" >Qty</th>
                </tr>
                <tbody id="${productName}StockTable" class="itemStockTable"></tbody>
            </table>
        </div>`;
    stockDiv.innerHTML += itemStockDivHtml;
}
async function coming() {
    const product = document.getElementById('comingProduct').value;
    const qty = parseInt(document.getElementById('comingQty').value);
    const price = parseFloat(document.getElementById('comingPrice').value);

    if (!validateInputs(product, qty, price)) {
        return false;
    }

    const productStockTable = document.getElementById(product + 'StockTable');
    const currentDate = document.getElementById('comingDate').value;

    // Append the new row for coming stock
    // productStockTable.innerHTML += `<tr>
    //     <td class="text-center">${currentDate}</td>
    //     <td class="text-center">${document.getElementById('comingNote').value}</td>
    //     <td class="text-right">${price}</td>
    //     <td class="text-right">${qty}</td>
    //     <td></td>
    //     <td></td>
    //     <td class="text-right">${productStockTotal[product] + qty}</td> <!-- Updated balance -->
    // </tr>`;

    // Update totals
    productStockTotal[product] += qty;
    productStockDetail[product].push({
        coming: qty,
        price: price,
        note: document.getElementById('comingNote').value,
        date: currentDate,
    });
    productCurrentStockDetail[product].push({ quantity: qty, price: price });

    await saveToFirestore();
    document.getElementById('comingForm').reset();
    renderStockTotal(product);
    updateDate();
}

async function going() {
    const product = document.getElementById('goingProduct').value;
    const qty = parseInt(document.getElementById('goingQty').value);
    const price = parseFloat(document.getElementById('goingPrice').value);

    if (!validateInputs(product, qty, price)) {
        return false;
    }

    if (qty > productStockTotal[product]) {
        alert('Not enough stock');
        return false;
    }

    const productStockTable = document.getElementById(product + 'StockTable');
    const goingDateValue = document.getElementById('goingDate').value;

    let remainingQty = qty;
    let totalDeducted = 0; // To keep track of total deducted quantity

    // Process outgoing stock in FIFO order
    while (remainingQty > 0 && productCurrentStockDetail[product].length > 0) {
        const stockDetail = productCurrentStockDetail[product][0];
        const availableStock = stockDetail.quantity;

        // Calculate how much to deduct from this stock detail
        const deductedQuantity = Math.min(availableStock, remainingQty);

        // Update totals
        productStockTotal[product] -= deductedQuantity;
        stockDetail.quantity -= deductedQuantity;
        remainingQty -= deductedQuantity;
        totalDeducted += deductedQuantity;

        // Record the outgoing stock
        productStockDetail[product].push({
            going: deductedQuantity,
            prices: price,
            note: document.getElementById('goingNote').value,
            date: goingDateValue,
            purchasingAmount: stockDetail.price,
        });

        // If this stock detail is now empty, remove it from current stock
        if (stockDetail.quantity === 0) {
            productCurrentStockDetail[product].shift();
        }
    }

    // Append a single row for the total deducted quantity
    // productStockTable.innerHTML += `<tr>
    //     <td class="text-center">${goingDateValue}</td>
    //     <td class="text-center">${document.getElementById('goingNote').value}</td>
    //     <td></td>
    //     <td></td>
    //     <td class="text-right">${price}</td>
    //     <td class="text-right">${totalDeducted}</td>
    //     <td class="text-right">${productStockTotal[product]}</td> <!-- Updated balance -->
    // </tr>`;

    await saveToFirestore();
    document.getElementById('goingForm').reset();
    renderStockTotal(product);
    updateDate();
}


function renderStockTotal(product) {
    document.getElementById(product + 'StockTd').innerHTML = productStockTotal[product];
    document.getElementById(product + 'StockHeading').innerHTML = 'Stock: ' + productStockTotal[product];
}

function updateDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('goingDate').value = today;
    document.getElementById('comingDate').value = today;
}

function filterStock() {
    const filter = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('stockTableBody').getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const productCell = rows[i].getElementsByTagName('td')[0];
        if (productCell) {
            const textValue = productCell.textContent || productCell.innerText;
            rows[i].style.display = textValue.toLowerCase().indexOf(filter) > -1 ? '' : 'none';
        }
    }
}

function renderStockDetails(productName) {
    const productStockTable = document.getElementById(productName + 'StockTable');
    const details = productStockDetail[productName];

    // Clear existing rows before rendering
    productStockTable.innerHTML = '';

    let balance = 0; // Initialize balance
    let totalIncoming = 0; // Total incoming quantities
    let totalOutgoing = 0;

    details.forEach(detail => {
        if (detail.coming) {
            totalIncoming += detail.coming;
        }
        if (detail.going) {
            totalOutgoing += detail.going; // Adjust this if you want the price of outgoing
        }
    });

    details.forEach(detail => {
        if (detail.coming) {
            balance += detail.coming; // Increase balance for incoming
        }
        if (detail.going) {
            balance -= detail.going; // Decrease balance for outgoing
        }

        let rowHtml = `<tr>
            <td class="text-center">${detail.date}</td>
            <td class="text-center">${detail.note || ''}</td>
            <td class="text-right">${detail.price || ''}</td>
            <td class="text-right">${detail.coming || ''}</td>
            <td class="text-right">${detail.prices || ''}</td>
            <td class="text-right">${detail.going || ''}</td>
            <td class="text-right">${balance}</td> <!-- Updated balance display -->
        </tr>`;
        productStockTable.innerHTML += rowHtml;
    });
    const summaryRowHtml = `<tr>
    <td colspan="2" class="text-center samecolor"><strong>Total</strong></td>
    <td class="samecolor"></td>
 
    <td class="text-right samecolor"><strong>${totalIncoming}</strong></td>
    <td class="samecolor"></td>
    <td class="text-right samecolor"><strong>${totalOutgoing}</strong></td> <!-- Total outgoing value -->
    <td class="text-right samecolor"><strong>${balance}</strong></td> <!-- Final balance -->
</tr>`;

    productStockTable.innerHTML += summaryRowHtml;
}


// document.addEventListener("DOMContentLoaded", () => {
//     updateDate();
//     loadFromFirestore();
// });


document.addEventListener("DOMContentLoaded", () => {
    updateDate();
    loadFromFirestore();
    loadNotesFromFirestore();
    // filterDateTransactions();

    // Add event listeners to the input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"],input[type="date"],button, select');
    inputs.forEach((input, index) => {
        input.addEventListener("keydown", (event) => {
            if (event.key === "ArrowRight") {
                event.preventDefault(); // Prevent form submission if inside a form
                const nextInput = inputs[index + 1];
                if (nextInput) {
                    nextInput.focus(); // Focus the next input
                }

            }
            else if (event.key === "ArrowLeft") {
                event.preventDefault(); // Prevent form submission if inside a form
                const nextInput = inputs[index - 1];
                if (nextInput) {
                    nextInput.focus(); // Focus the next input
                }

            }
        });
    });
});


function filterDateTransactions() {
    stockDivHolder.style.display = 'none'
    maindivNote.style.display = 'none'

    const selectedDate = document.getElementById('searchDateDetail').value;
    const tbody = document.getElementById('datedetails');
    tbody.innerHTML = ''; // Clear previous rows

    // Loop through each product to find transactions for the selected date
    for (const product in productStockDetail) {
        const details = productStockDetail[product];

        let balance = 0; // Initialize balance for the product
        let totalIncoming = 0;
        let totalOutgoing = 0;

        details.forEach(detail => {
            if (detail.date === selectedDate) {
                // Update balance based on incoming and outgoing quantities
                if (detail.coming) {
                    balance += detail.coming;
                    totalIncoming += detail.coming;
                }
                if (detail.going) {
                    balance -= detail.going;
                    totalOutgoing += detail.going;
                }

                // Append rows only for transactions that match the selected date
                const rowHtml = `<tr>
                    <td class="text-center">${product}</td>
                    <td class="text-center">${detail.note || ''}</td>
                    <td class="text-right">${detail.price || ''}</td>
                    <td class="text-right">${detail.coming || ''}</td>
                    <td class="text-right">${detail.prices || ''}</td>
                    <td class="text-right">${detail.going || ''}</td>
                    <td class="text-right">${balance}</td> <!-- Updated balance display -->
                </tr>`;
                tbody.innerHTML += rowHtml;
            }
        });

        // Append total row if there are transactions for the product
        if (totalIncoming > 0 || totalOutgoing > 0) {
            const totalRowHtml = `<tr style="font-weight: bold;">
                <td style="background-color:beige;
    color: black;" colspan="2" class="text-center"><strong>Total for ${product}</strong></td>
             <td style="background-color:beige;
    color: black;"></td>   <td style="background-color:beige;
    color: black;" class="text-right"><strong>${totalIncoming}</strong></td>
                <td style="background-color:beige;
    color: black;"></td>
                <td style="background-color:beige;
    color: black;" class="text-right"><strong>${totalOutgoing}</strong></td>
                <td style="background-color:beige;
    color: black;" class="text-right"><strong>${calculateBalanceForProduct(product, selectedDate)}</strong></td>
            </tr>`;
            tbody.innerHTML += totalRowHtml;
        }
    }
}


// Function to calculate balance for a specific product on a given date
function calculateBalanceForProduct(product, date) {
    let balance = 0;
    const details = productStockDetail[product];

    details.forEach(detail => {
        if (detail.date <= date) {
            if (detail.coming) {
                balance += detail.coming;
            }
            if (detail.going) {
                balance -= detail.going;
            }
        }
    });

    return balance;
}

async function loadNotesFromFirestore() {
    const snapshot = await getDocs(collection(db, 'products'));
    const notesSet = new Set();

    snapshot.forEach(doc => {
        const data = doc.data();
        const details = data.stockDetail || [];
        details.forEach(detail => {
            if (detail.note) {
                notesSet.add(detail.note);
            }
        });
    });

    const noteSelect = document.getElementById('noteSelect');
    noteSelect.innerHTML = '<option selected disabled value="">Select a Name</option>';
    notesSet.forEach(note => {
        noteSelect.innerHTML += `<option value="${note}">${note}</option>`;
    });
}
function filterNoteTransactions() {
    // Hide unnecessary divs
    stockDivHolder.style.display = 'none';
    maindivDate.style.display = 'none';

    // Get selected values
    const selectedNote = document.getElementById('noteSelect').value;
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    const tbody = document.getElementById('noteDetailsBody');
    tbody.innerHTML = ''; // Clear previous rows

    const filteredDetails = [];

    // Collect all details that match the criteria
    for (const product in productStockDetail) {
        const details = productStockDetail[product];

        details.forEach(detail => {
            const detailDate = new Date(detail.date);
            if (detail.note && 
                detail.note.toLowerCase().includes(selectedNote.toLowerCase()) &&
                detailDate >= startDate && 
                detailDate <= endDate) {
                filteredDetails.push({ detail, product });
            }
        });
    }

    // Sort the details by date
    filteredDetails.sort((a, b) => new Date(a.detail.date) - new Date(b.detail.date));

    let currentBalance = 0;
    let currentDate = '';
    let totalComing = 0;
    let totalGoing = 0;

    // Generate HTML for the sorted and filtered details
    filteredDetails.forEach(({ detail, product }) => {
        const detailDate = detail.date;

        if (currentDate !== detailDate) {
            // If we change the date, add a total row for the previous date
            if (currentDate) {
                const totalRowHtml = `<tr style="background-color:beige">
                    <td class="text-center">${currentDate}</td>
                    <td colspan='2' class="text-center"><strong>Total</strong></td>
                    <td class="text-right"></td>
                    <td class="text-right"><strong>${totalComing}</strong></td>
                    <td class="text-right"></td>
                    <td class="text-right"><strong>${totalGoing}</strong></td>
                    <td class="text-right"><strong>${currentBalance}</strong></td>
                </tr>`;
                tbody.innerHTML += totalRowHtml;
            }

            // Reset for the new date
            currentDate = detailDate;
            currentBalance = 0; // Reset balance for the new date
            totalComing = 0; // Reset total coming for the new date
            totalGoing = 0; // Reset total going for the new date
        }

        // Update balance based on incoming or outgoing transactions
        if (detail.coming) {
            currentBalance += detail.coming; // Increase balance for incoming stock
            totalComing += detail.coming; // Accumulate total coming
        }
        if (detail.going) {
            currentBalance -= detail.going; // Decrease balance for outgoing stock
            totalGoing += detail.going; // Accumulate total going
        }

        // Add detail row
        const rowHtml = `<tr style="font-weight:100">
            <td class="text-center">${detailDate}</td>
            <td class="text-center">${product}</td>
            

            <td class="text-center">${detail.note || ''}</td>
            <td class="text-right">${detail.price || ''}</td>
            <td class="text-right">${detail.coming || ''}</td>
            <td class="text-right">${detail.prices || ''}</td>
            <td class="text-right">${detail.going || ''}</td>
            <td class="text-right">${currentBalance}</td>
        </tr>`;
        tbody.innerHTML += rowHtml;
    });

    // Add total row for the last date
    if (currentDate) {
        const totalRowHtml = `<tr style="font-weight: bold; background-color:beige">
            <td class="text-center">${currentDate}</td>
            <td colspan='2' class="text-center"><strong>Total</strong></td>
            <td class="text-right"></td>
            <td class="text-right"><strong>${totalComing}</strong></td>
            <td class="text-right"></td>
            <td class="text-right"><strong>${totalGoing}</strong></td>
            <td class="text-right"><strong>${currentBalance}</strong></td>
        </tr>`;
        tbody.innerHTML += totalRowHtml;
    }
}
