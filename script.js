let rentalChart; // Variável global para armazenar a instância do gráfico

// Função para carregar arquivos CSV e Excel
async function loadFiles() {
    const airbnbFile = document.getElementById('airbnbFile').files[0];
    const bookingFile = document.getElementById('bookingFile').files[0];

    const airbnbData = await readCSV(airbnbFile);
    const bookingData = await readExcel(bookingFile);

    return { airbnbData, bookingData };
}

// Função para ler arquivo CSV
async function readCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').slice(1);
            const data = lines.map(line => {
                const [property, startDate, endDate] = line.split(',');
                return { property, startDate: new Date(startDate), endDate: new Date(endDate) };
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

            const result = jsonData.slice(1).map(row => {
                return {
                    property: row[0],
                    startDate: XLSX.SSF.parse_date_code(row[1]),
                    endDate: XLSX.SSF.parse_date_code(row[2])
                };
            }).map(item => ({
                property: item.property,
                startDate: new Date(item.startDate.y, item.startDate.m - 1, item.startDate.d),
                endDate: new Date(item.endDate.y, item.endDate.m - 1, item.endDate.d)
            }));
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Função para unificar reservas
function unifyBookings(airbnbData, bookingData) {
    const allBookings = [
        ...airbnbData.map(b => ({ ...b, source: 'Airbnb' })),
        ...bookingData.map(b => ({ ...b, source: 'Booking' }))
    ];

    const bookingsMap = {};

    allBookings.forEach(({ property, startDate, endDate, source }) => {
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            if (!bookingsMap[dateString]) {
                bookingsMap[dateString] = [];
            }
            bookingsMap[dateString].push({ property, source });
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
                    text.innerText = `${booking.property} (${booking.source})`;
                    dayDiv.appendChild(text);
                });
            }

            daysGrid.appendChild(dayDiv);
        }

        monthDiv.appendChild(daysGrid);
        calendarContainer.appendChild(monthDiv);
    });
}

// Função para mostrar a dashboard com gráficos
function showDashboard(bookingsMap) {
    const rentalAnalysis = document.getElementById('rental-analysis');
    rentalAnalysis.innerHTML = ''; // Limpa o conteúdo anterior

    // Preparar dados para o gráfico
    const dates = Object.keys(bookingsMap);
    const rentalCounts = dates.map(date => bookingsMap[date].length);

    const ctx = document.getElementById('rentalChart').getContext('2d');

    // Verifica se já existe um gráfico e destrói se necessário
    if (rentalChart) {
        rentalChart.destroy(); // Destrói o gráfico existente
    }

    rentalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Total de Aluguéis',
                data: rentalCounts,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Função principal atualizada para incluir a dashboard
async function main() {
    const { airbnbData, bookingData } = await loadFiles();
    const bookingsMap = unifyBookings(airbnbData, bookingData);
    renderCalendar(bookingsMap);
    showDashboard(bookingsMap); // Chama a função para mostrar a dashboard
}

// Evento para carregar dados e renderizar o calendário e a dashboard
document.getElementById('loadButton').addEventListener('click', async () => {
    const { airbnbData, bookingData } = await loadFiles();
    const bookingsMap = unifyBookings(airbnbData, bookingData);
    renderCalendar(bookingsMap);
    showDashboard(bookingsMap); // Chama a função para mostrar a dashboard

    // Preencher o filtro de propriedades
    const propertyFilter = document.getElementById('propertyFilter');
    const uniqueProperties = [...new Set([...airbnbData.map(b => b.property), ...bookingData.map(b => b.property)])];
    propertyFilter.innerHTML = ''; // Limpa as opções anteriores
    uniqueProperties.forEach(property => {
        const option = document.createElement('option');
        option.value = property;
        option.innerText = property;
        propertyFilter.appendChild(option);
    });
});

// Filtrar reservas
document.getElementById('applyFilterButton').addEventListener('click', () => {
    const selectedProperty = document.getElementById('propertyFilter').value;
    const calendarDays = document.querySelectorAll('.day');

    calendarDays.forEach(day => {
        const bookingTexts = Array.from(day.children).filter(child => child.tagName === 'DIV');
        const isVisible = selectedProperty ? bookingTexts.some(text => text.innerText.includes(selectedProperty)) : true;

        day.style.display = isVisible ? 'block' : 'none'; // Mostra ou oculta dias
    });
});

// Evento para mostrar a dashboard ao clicar no botão
document.getElementById('showDashboardButton').addEventListener('click', () => {
    const airbnbFile = document.getElementById('airbnbFile').files[0];
    const bookingFile = document.getElementById('bookingFile').files[0];

    if (airbnbFile && bookingFile) {
        loadFiles().then(({ airbnbData, bookingData }) => {
            const bookingsMap = unifyBookings(airbnbData, bookingData);
            showDashboard(bookingsMap); // Mostra a dashboard
        });
    } else {
        alert('Por favor, carregue os arquivos antes de mostrar a dashboard.');
    }
});

// teste
async function loadFiles() {
    const airbnbFile = document.getElementById('airbnbFile').files[0];
    const bookingFile = document.getElementById('bookingFile').files[0];

    if (!airbnbFile || !bookingFile) {
        console.error("Por favor, selecione os dois arquivos.");
        return;
    }

    const airbnbData = await readCSV(airbnbFile);
    const bookingData = await readExcel(bookingFile);

    return { airbnbData, bookingData };
}
