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
        'Alco_1 1': 'Коктейли 1+1'
    };

    // Определение разделов для групп
    const GROUPS = {
        dinner: ['Salaty', 'Zacuski', 'Supy', 'Gor_bluda', 'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty'],
        bar: ['Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco', 'alco', 'Alco_1 1']
    };

    // Все возможные разделы
    const ALL_SECTIONS = [
        'zavtrak', 'Detskoe', 'Salaty', 'Zacuski', 'Supy', 'Gor_bluda',
        'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty', '103BY',
        'Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco',
        'alco', 'Alco_1 1'
    ];

    let allCards = [];          // все загруженные карточки (неизменяемые)
    let learningCards = [];     // текущая очередь для обучения
    let currentCardIndex = 0;   // индекс в learningCards
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    // DOM элементы
    const $flashcard = $('.flashcard');
    const $frontImg = $('#frontImg');
    const $backImg = $('#backImg');
    const $questionBtn = $('#question, #question-mobile');
    const $flipBtn = $('#flipCard, #flipCard-mobile');
    const $forgetBtn = $('#forgetBtn, #forgetBtn-mobile');
    const $rememberBtn = $('#rememberBtn, #rememberBtn-mobile');
    const $progressInfo = $('#progressInfo');
    const $sectionTitle = $('#sectionTitle');

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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

    // Загрузка карточек из нескольких разделов
    async function loadCardsFromSections(sectionsList, title) {
        $sectionTitle.text(`Загрузка ${title}...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);
        $forgetBtn.prop('disabled', true);
        $rememberBtn.prop('disabled', true);

        const promises = sectionsList.map(sectionName => loadCardsFromSection(sectionName));
        const results = await Promise.all(promises);
        allCards = results.flat();

        if (allCards.length === 0) {
            $sectionTitle.text(`Не найдено карточек для ${title}`);
            return;
        }

        $sectionTitle.text(title);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);
        $forgetBtn.prop('disabled', false);
        $rememberBtn.prop('disabled', false);

        // Инициализация очереди обучения
        learningCards = [...allCards];
        shuffleArray(learningCards);
        currentCardIndex = 0;
        updateProgressInfo();
        showCurrentCard();
        $flashcard.show();
    }

    async function loadCardsForSection(sectionName) {
        const displayName = sectionDisplayNames[sectionName] || sectionName;
        $sectionTitle.text(`Загрузка раздела "${displayName}"...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);
        $forgetBtn.prop('disabled', true);
        $rememberBtn.prop('disabled', true);

        allCards = await loadCardsFromSection(sectionName);

        if (allCards.length === 0) {
            $sectionTitle.text(`Раздел "${displayName}" не содержит карточек`);
            return;
        }

        $sectionTitle.text(`Изучаем раздел: ${displayName}`);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);
        $forgetBtn.prop('disabled', false);
        $rememberBtn.prop('disabled', false);

        learningCards = [...allCards];
        shuffleArray(learningCards);
        currentCardIndex = 0;
        updateProgressInfo();
        showCurrentCard();
        $flashcard.show();
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function updateProgressInfo() {
        const total = learningCards.length;
        $progressInfo.text(`Осталось карточек: ${total} / ${allCards.length}`);
    }

    // Показать текущую карточку (без изменения состояния)
    function showCurrentCard() {
        if (learningCards.length === 0) {
            $sectionTitle.text('🎉 Поздравляем! Вы выучили все карточки! 🎉');
            $flashcard.hide();
            $questionBtn.prop('disabled', true);
            $flipBtn.prop('disabled', true);
            $forgetBtn.prop('disabled', true);
            $rememberBtn.prop('disabled', true);
            return;
        }

        const card = learningCards[currentCardIndex];

        // Если карточка была перевёрнута, возвращаем в исходное положение
        if ($flashcard.hasClass('flipped')) {
            $flashcard.removeClass('flipped');
            $flipBtn.text('Посмотреть состав');
            $('#flipCard-mobile').text('Посмотреть состав');
        }

        // Плавно обновляем изображения
        updateCardImages(card);
    }

    // Плавная смена изображений (без скрытия карточки)
    function updateCardImages(card) {
        const newFront = new Image();
        const newBack = new Image();

        let loaded = 0;

        function checkLoaded() {
            loaded++;
            if (loaded === 2) {
                $frontImg.attr('src', card.question);
                $backImg.attr('src', card.answer);
            }
        }

        newFront.onload = checkLoaded;
        newBack.onload = checkLoaded;
        newFront.onerror = checkLoaded;
        newBack.onerror = checkLoaded;

        newFront.src = card.question;
        newBack.src = card.answer;
    }

    // Случайная карточка (без изменения очереди)
    function showRandomCard() {
        if (learningCards.length === 0) return;
        const newIndex = Math.floor(Math.random() * learningCards.length);
        if (newIndex === currentCardIndex && learningCards.length > 1) {
            // чтобы не показывать ту же самую, если есть другие
            currentCardIndex = (newIndex + 1) % learningCards.length;
        } else {
            currentCardIndex = newIndex;
        }
        showCurrentCard();
    }

    // ========== ЛОГИКА ОБУЧЕНИЯ ==========
    function markKnown() {
        if (learningCards.length === 0) return;

        // Удаляем текущую карточку
        learningCards.splice(currentCardIndex, 1);
        updateProgressInfo();

        if (learningCards.length === 0) {
            showCurrentCard(); // покажет сообщение о завершении
            return;
        }

        // Корректируем индекс, если удалили последний
        if (currentCardIndex >= learningCards.length) {
            currentCardIndex = 0;
        }
        animateSwipe('right');
    }

    function markUnknown() {
        if (learningCards.length === 0) return;

        // Перемещаем текущую карточку в конец
        const card = learningCards.splice(currentCardIndex, 1)[0];
        learningCards.push(card);
        updateProgressInfo();

        // Индекс остаётся на том же месте (теперь там следующий элемент)
        if (currentCardIndex >= learningCards.length) {
            currentCardIndex = 0;
        }
        animateSwipe('left');
    }

    function animateSwipe(direction) {
        const className = direction === 'right' ? 'swipe-right' : 'swipe-left';
        $flashcard.addClass(className);

        setTimeout(() => {
            $flashcard.removeClass(className);
            showCurrentCard();
        }, 300);
    }

    // ========== СВАЙПЫ МЫШЬЮ / ТАЧАМИ ==========
    $flashcard.on('mousedown touchstart', function(e) {
        if (learningCards.length === 0) return;
        isDragging = true;
        startX = e.pageX || e.originalEvent.touches[0].pageX;
        $flashcard.addClass('dragging');
    });

    $(document).on('mousemove touchmove', function(e) {
        if (!isDragging) return;
        currentX = e.pageX || e.originalEvent.touches[0].pageX;
        let diff = currentX - startX;
        $flashcard.css('transform', `translateX(${diff}px) rotate(${diff * 0.05}deg)`);
    });

    $(document).on('mouseup touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        $flashcard.removeClass('dragging');
        let diff = currentX - startX;
        $flashcard.css('transform', '');

        if (Math.abs(diff) > 120) {
            if (diff > 0) {
                markKnown();
            } else {
                markUnknown();
            }
        }
    });

    // ========== ОБРАБОТЧИКИ КНОПОК ==========
    $questionBtn.on('click', showRandomCard);
    $flipBtn.on('click', function() {
        if ($flashcard.is(':visible')) {
            $flashcard.toggleClass('flipped');
            const text = $flashcard.hasClass('flipped') ? 'Посмотреть фото' : 'Посмотреть состав';
            $flipBtn.text(text);
            $('#flipCard-mobile').text(text);
        }
    });
    $flashcard.on('click', function() {
        if ($flashcard.is(':visible')) {
            $flashcard.toggleClass('flipped');
            const text = $flashcard.hasClass('flipped') ? 'Посмотреть фото' : 'Посмотреть состав';
            $flipBtn.text(text);
            $('#flipCard-mobile').text(text);
        }
    });

    $rememberBtn.on('click', markKnown);
    $forgetBtn.on('click', markUnknown);

    // ========== ЗАПУСК ==========
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
        $forgetBtn.prop('disabled', true);
        $rememberBtn.prop('disabled', true);
    }
});
