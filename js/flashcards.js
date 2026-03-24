$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const allMode = urlParams.get('all') === 'true';
    const group = urlParams.get('group');

    // Отображаемые имена для разделов
    const sectionDisplayNames = {
        'zavtrak': 'Завтраки',
        'Detskoe': 'Детское меню',
        'Salaty': 'Салаты',
        'Zacuski': 'Закуски',
        'Supy': 'Супы',
        'Gor_bluda': 'Горячие блюда',
        'Draniki': 'Драники',
        'Pasta': 'Паста',
        'Burgery_tostada': 'Бургеры и тостада',
        'Pizza': 'Пицца',
        'Deserty': 'Десерты',
        '103BY': '103.BY',
        'Sogr_napitki': 'Согревающие напитки',
        'Firm_kofe': 'Фирменный кофе',
        'Kakao_kofe_matcha': 'Какао, кофе, матча',
        'Chaj': 'Чай',
        'Bezalco': 'Безалкогольные коктейли',
        'alco': 'Алкогольные коктейли',
        'Alco_1+1': 'Коктейли 1+1'
    };

    // Определение разделов для групп
    const GROUPS = {
        dinner: ['Salaty', 'Zacuski', 'Supy', 'Gor_bluda', 'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty'],
        bar: ['Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco', 'alco', 'Alco_1+1']
    };

    // Все возможные разделы (полный список)
    const ALL_SECTIONS = [
        'zavtrak', 'Detskoe', 'Salaty', 'Zacuski', 'Supy', 'Gor_bluda',
        'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty', '103BY',
        'Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco',
        'alco', 'Alco_1+1'
    ];

    let cards = [];
    let remainingIndices = [];
    let currentCardIndex = null;
    let noRepeatMode = false;

    // DOM элементы
    const $flashcard = $('.flashcard');
    const $frontImg = $('#frontImg');
    const $backImg = $('#backImg');
    const $questionBtn = $('#question, #question-mobile');
    const $flipBtn = $('#flipCard, #flipCard-mobile');
    const $noRepeatCheckbox = $('#noRepeatMode');
    const $progressInfo = $('#progressInfo');
    const $sectionTitle = $('#sectionTitle');

    // Получение максимального номера файла в папке
    function getMaxImageNumber(folderPath) {
        return new Promise((resolve) => {
            let i = 1;
            let maxNumber = 0;
            function checkImage(num) {
                const img = new Image();
                img.onload = () => {
                    maxNumber = num;
                    checkImage(num + 1);
                };
                img.onerror = () => {
                    resolve(maxNumber);
                };
                img.src = `${folderPath}${num}.png`;
            }
            checkImage(1);
        });
    }

    // Загрузка карточек из одного раздела
    async function loadCardsFromSection(sectionName) {
        const basePath = `../images/${sectionName}/`;
        const maxNum = await getMaxImageNumber(basePath);
        const sectionCards = [];
        for (let i = 1; i <= maxNum; i += 2) {
            if (i + 1 <= maxNum) {
                sectionCards.push({
                    question: `${basePath}${i}.png`,
                    answer: `${basePath}${i+1}.png`
                });
            }
        }
        return sectionCards;
    }

    // Загрузка карточек из нескольких разделов (группы или все)
    async function loadCardsFromSections(sectionsList, title) {
        $sectionTitle.text(`Загрузка ${title}...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);

        const promises = sectionsList.map(sectionName => loadCardsFromSection(sectionName));
        const results = await Promise.all(promises);
        cards = results.flat();

        if (cards.length === 0) {
            $sectionTitle.text(`Не найдено карточек для ${title}`);
            return;
        }

        $sectionTitle.text(title);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);

        // Включаем режим без повторений
        $noRepeatCheckbox.prop('checked', true);
        noRepeatMode = true;
        resetRemainingIndices();

        $flashcard.show();
        showRandomCard();
    }

    // Загрузка одного раздела
    async function loadCardsForSection(sectionName) {
        const displayName = sectionDisplayNames[sectionName] || sectionName;
        $sectionTitle.text(`Загрузка раздела "${displayName}"...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);

        cards = await loadCardsFromSection(sectionName);

        if (cards.length === 0) {
            $sectionTitle.text(`Раздел "${displayName}" не содержит карточек`);
            return;
        }

        $sectionTitle.text(`Изучаем раздел: ${displayName}`);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);

        noRepeatMode = $noRepeatCheckbox.is(':checked');
        resetRemainingIndices();

        $flashcard.show();
        showRandomCard();
    }

    // Сброс оставшихся индексов
    function resetRemainingIndices() {
        remainingIndices = cards.map((_, idx) => idx);
        shuffleArray(remainingIndices);
        updateProgressInfo();
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function updateProgressInfo() {
        if (noRepeatMode) {
            const shown = cards.length - remainingIndices.length;
            $progressInfo.text(`Осталось карточек: ${remainingIndices.length} / ${cards.length}`);
        } else {
            $progressInfo.text('Режим повторений: случайный выбор');
        }
    }

    function showRandomCard() {
        if (cards.length === 0) return;

        let index;
        if (noRepeatMode) {
            if (remainingIndices.length === 0) {
                resetRemainingIndices();
            }
            index = remainingIndices.pop();
            updateProgressInfo();
        } else {
            index = Math.floor(Math.random() * cards.length);
        }

        currentCardIndex = index;
        const card = cards[currentCardIndex];

        // Обновляем текст кнопок (на случай, если они были изменены)
        $flipBtn.text('Посмотреть состав');
        $('#flipCard-mobile').text('Посмотреть состав');

        // Создаём промисы для загрузки новых изображений
        const questionLoad = new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = card.question;
        });
        const answerLoad = new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = card.answer;
        });

        // Ждём загрузки обоих изображений, затем меняем src и сбрасываем переворот
        Promise.all([questionLoad, answerLoad]).then(() => {
            $frontImg.attr('src', card.question);
            $backImg.attr('src', card.answer);
            // Сбрасываем переворот (если карточка была перевёрнута)
            $flashcard.removeClass('flipped');
            // Показываем карточку (на случай если была скрыта)
            $flashcard.show();
        });
    }

    function flipCard() {
        if (!$flashcard.is(':visible')) return;
        $flashcard.toggleClass('flipped');
        const text = $flashcard.hasClass('flipped') ? 'Посмотреть фото' : 'Посмотреть состав';
        $flipBtn.text(text);
        $('#flipCard-mobile').text(text);
    }

    // Обработчики событий
    $questionBtn.on('click', showRandomCard);
    $flipBtn.on('click', flipCard);
    $flashcard.on('click', flipCard);

    $noRepeatCheckbox.on('change', function() {
        noRepeatMode = $(this).is(':checked');
        if (noRepeatMode) {
            resetRemainingIndices();
        } else {
            updateProgressInfo();
        }
        showRandomCard();
    });

    // Логика выбора режима
    if (allMode) {
        loadCardsFromSections(ALL_SECTIONS, 'Все разделы меню');
    } else if (group && GROUPS[group]) {
        let title = '';
        if (group === 'dinner') title = 'Ужин (все блюда)';
        else if (group === 'bar') title = 'Бар (все напитки)';
        loadCardsFromSections(GROUPS[group], title);
    } else if (section) {
        loadCardsForSection(section);
    } else {
        $sectionTitle.text('Выберите раздел в меню');
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);
    }
});
