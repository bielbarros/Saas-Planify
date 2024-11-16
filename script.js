// Função para ler arquivo CSV
async function readCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').slice(1);
            const data = lines.map(line => {
                const [property, startDate, endDate, checkInTime, checkOutTime, clientName, paymentMethod] = line.split(',');
                return {
                    property,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    checkInTime,
                    checkOutTime,
                    clientName,
                    paymentMethod
                };
            });
            resolve(data);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Função para ler arquivo Excel
async function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const result = jsonData.slice(1).map(row => ({
                property: row[0],
                startDate: new Date(row[1]),
                endDate: new Date(row[2]),
                checkInTime: row[3],
                checkOutTime: row[4],
                clientName: row[5],
                paymentMethod: row[6]
            }));

            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Função para unificar as reservas
function unifyBookings(airbnbData, bookingData) {
    const allBookings = [
        ...airbnbData.map(b => ({ ...b, source: 'Airbnb' })),
        ...bookingData.map(b => ({ ...b, source: 'Booking' }))
    ];

    const bookingsMap = {};

    allBookings.forEach(({ property, startDate, endDate, checkInTime, checkOutTime, clientName, paymentMethod, source }) => {
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            if (!bookingsMap[dateString]) {
                bookingsMap[dateString] = [];
            }
            bookingsMap[dateString].push({ property, checkInTime, checkOutTime, clientName, paymentMethod, source });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });

    return bookingsMap;
}

// Função para renderizar o calendário
function renderCalendar(bookingsMap) {
    const calendarContainer = document.getElementById('calendar');
    calendarContainer.innerHTML = ''; // Limpa o calendário

    const year = 2024;
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i));

    months.forEach(month => {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month';

        const monthHeader = document.createElement('h3');
        monthHeader.innerText = month.toLocaleString('default', { month: 'long' });
        monthDiv.appendChild(monthHeader);

        const daysInMonth = new Date(year, month.getMonth() + 1, 0).getDate();
        const firstDay = new Date(year, month.getMonth(), 1).getDay();

        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        for (let i = 0; i < firstDay; i++) {
            daysGrid.appendChild(document.createElement('div')); // Espaços vazios
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = `${year}-${(month.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';
            dayDiv.innerText = day;

            if (bookingsMap[dateString]) {
                const bookings = bookingsMap[dateString];
                if (bookings.length > 1) {
                    dayDiv.setAttribute('data-overbooking', 'true'); // Adiciona atributo para overbooking
                }
                bookings.forEach(booking => {
                    const text = document.createElement('div');
                    text.innerText = `${booking.property} (Check-in: ${booking.checkInTime}, Check-out: ${booking.checkOutTime}, Cliente: ${booking.clientName}, Pagamento: ${booking.paymentMethod}, Fonte: ${booking.source})`;
                    dayDiv.appendChild(text);
                });
            }

            daysGrid.appendChild(dayDiv);
        }

        monthDiv.appendChild(daysGrid);
        calendarContainer.appendChild(monthDiv);
    });
}

// Evento para carregar os arquivos e gerar o calendário
document.getElementById('loadButton').addEventListener('click', async () => {
    const airbnbFile = document.getElementById('airbnbFile').files[0];
    const bookingFile = document.getElementById('bookingFile').files[0];

    if (!airbnbFile || !bookingFile) {
        alert('Por favor, selecione os arquivos.');
        return;
    }

    const airbnbData = await readCSV(airbnbFile);
    const bookingData = await readExcel(bookingFile);
    const bookingsMap = unifyBookings(airbnbData, bookingData);
    renderCalendar(bookingsMap);
});

// Simulação de usuários (em uma aplicação real, isso seria feito com autenticação no backend)
const validUsername = 'admin';
const validPassword = '12345';

// Referências aos elementos da tela de login e conteúdo principal
const loginScreen = document.getElementById('loginScreen');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Evento de envio do formulário de login
loginForm.addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o envio do formulário

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Verifica se as credenciais são válidas
    if (username === validUsername && password === validPassword) {
        // Esconde a tela de login e mostra o conteúdo principal
        loginScreen.style.display = 'none'; // Oculta a tela de login
        mainContent.style.display = 'block'; // Exibe o conteúdo principal
    } else {
        // Exibe mensagem de erro
        loginError.classList.remove('hidden');
    }
});
