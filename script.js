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

            const bookings = bookingsMap[dateString];
            if (bookings) {
                const isOverbooked = bookings.length > 1;
                const source = isOverbooked ? 'Overbooking' : bookings[0].source;

                dayDiv.setAttribute('data-source', source);
                if (isOverbooked) dayDiv.setAttribute('data-overbooking', 'true');
            } else {
                dayDiv.setAttribute('data-source', 'none');
            }

            // Evento de clique no dia
            dayDiv.addEventListener('click', () => {
                openModal(dateString, bookings || []);
            });

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

// Simulação de múltiplos usuários (em uma aplicação real, isso seria feito com autenticação no backend)
const users = [
    { username: 'admin', password: 'admin' },
    { username: 'barao1', password: '12345' },
    { username: 'fpontes', password: '201964'},
    { username: 'NicoleBarros', password: 'biel123$%'}
];

// Referências aos elementos da tela de login e conteúdo principal
const loginScreen = document.getElementById('loginScreen');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const passwordField = document.getElementById('password'); // Campo de senha
const togglePassword = document.getElementById('togglePassword'); // Ícone ou botão para alternar a visibilidade da senha

// Evento de envio do formulário de login
loginForm.addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o envio do formulário

    const username = document.getElementById('username').value;
    const password = passwordField.value;

    // Verifica se as credenciais são válidas
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // Esconde a tela de login e mostra o conteúdo principal
        loginScreen.style.display = 'none'; // Oculta a tela de login
        mainContent.style.display = 'block'; // Exibe o conteúdo principal
    } else {
        // Exibe mensagem de erro
        loginError.classList.remove('hidden');
    }
});

// Evento para alternar a visibilidade da senha
togglePassword.addEventListener('click', function () {
    // Verifica o tipo atual do campo de senha
    const type = passwordField.type === 'password' ? 'text' : 'password';
    passwordField.type = type; // Alterna o tipo entre 'password' e 'text'

    // Alterna o ícone ou o texto
    this.classList.toggle('fa-eye'); // Se estiver usando ícones, como FontAwesome
    this.classList.toggle('fa-eye-slash'); // Alterna entre "olho aberto" e "olho fechado"
});
function openModal(dateString, bookings) {
    const modal = document.getElementById('modal');
    const modalDetails = document.getElementById('modalDetails');
    modalDetails.innerHTML = ''; // Limpa o conteúdo anterior

    const title = document.createElement('h4');
    title.innerText = `Reservas em ${dateString}`;
    modalDetails.appendChild(title);

    if (bookings.length === 0) {
        modalDetails.innerHTML += '<p>Nenhuma reserva para esta data.</p>';
    } else {
        bookings.forEach(booking => {
            const div = document.createElement('div');
            div.innerText = `${booking.property} (Check-in: ${booking.checkInTime}, Check-out: ${booking.checkOutTime}, Cliente: ${booking.clientName}, Fonte: ${booking.source})`;
            modalDetails.appendChild(div);
        });
    }

    modal.style.display = 'block';

    // Botão de fechar modal
    const closeModal = document.getElementById('closeModal');
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    // Botão para aplicar alterações (se necessário)
    const applyChanges = document.getElementById('applyChanges');
    applyChanges.onclick = () => {
        alert(`Alterações para ${dateString} aplicadas!`);
        modal.style.display = 'none';
    };
}

// Fechar modal ao clicar fora
window.onclick = function (event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
