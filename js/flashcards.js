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

    const ALL_SECTIONS = [
        'zavtrak', 'Detskoe', 'Salaty', 'Zacuski', 'Supy', 'Gor_bluda',
        'Draniki', 'Pasta', 'Burgery_tostada', 'Pizza', 'Deserty', '103BY',
        'Sogr_napitki', 'Firm_kofe', 'Kakao_kofe_matcha', 'Chaj', 'Bezalco',
        'alco', 'Alco_1 1'
    ];

    let allCards = [];
    let learningCards = [];
    let currentCardIndex = 0;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    // DOM элементы
    const $flashcard = $('.flashcard');
    const $frontImg = $('#frontImg');
    const $backImg = $('#backImg');
    const $questionBtn = $('#question, #question-mobile');
    const $flipBtn = $('#flipCard, #flipCard-mobile');
    const $progressInfo = $('#progressInfo');
    const $sectionTitle = $('#sectionTitle');

    // ========== ОПТИМИЗИРОВАННАЯ ЗАГРУЗКА (без getMaxImageNumber) ==========
    async function loadCardsFromSection(sectionName) {
        const basePath = `../images/${sectionName}/`;
        const sectionCards = [];
        const MAX = 100; // запас – больше, чем в любой папке

        for (let i = 1; i <= MAX; i += 2) {
            sectionCards.push({
                question: `${basePath}${i}.png`,
                answer: `${basePath}${i+1}.png`
            });
        }
        return sectionCards;
    }

    async function loadCardsFromSections(sectionsList, title) {
        $sectionTitle.text(`Загрузка ${title}...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);

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

        allCards = await loadCardsFromSection(sectionName);

        if (allCards.length === 0) {
            $sectionTitle.text(`Раздел "${displayName}" не содержит карточек`);
            return;
        }

        $sectionTitle.text(`Изучаем раздел: ${displayName}`);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);

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
        $progressInfo.text(`Осталось карточек: ${learningCards.length} / ${allCards.length}`);
    }

    // Простая смена картинок (без preload)
    function updateCardImages(card) {
        $frontImg.attr('src', card.question);
        $backImg.attr('src', card.answer);
    }

    function showCurrentCard() {
        if (learningCards.length === 0) {
            $sectionTitle.text('🎉 Поздравляем! Вы выучили все карточки! 🎉');
            $flashcard.hide();
            $questionBtn.prop('disabled', true);
            $flipBtn.prop('disabled', true);
            return;
        }

        const card = learningCards[currentCardIndex];

        if ($flashcard.hasClass('flipped')) {
            $flashcard.removeClass('flipped');
            $flipBtn.text('Посмотреть состав');
            $('#flipCard-mobile').text('Посмотреть состав');
        }

        updateCardImages(card);
    }

    function showRandomCard() {
        if (learningCards.length === 0) return;
        let newIndex = Math.floor(Math.random() * learningCards.length);
        if (newIndex === currentCardIndex && learningCards.length > 1) {
            newIndex = (newIndex + 1) % learningCards.length;
        }
        currentCardIndex = newIndex;
        showCurrentCard();
    }

    // ========== ЛОГИКА ОБУЧЕНИЯ ==========
    function markKnown() {
        if (learningCards.length === 0) return;
        learningCards.splice(currentCardIndex, 1);
        updateProgressInfo();

        if (learningCards.length === 0) {
            showCurrentCard();
            return;
        }

        if (currentCardIndex >= learningCards.length) {
            currentCardIndex = 0;
        }
        animateSwipe('right');
    }

    function markUnknown() {
        if (learningCards.length === 0) return;
        const card = learningCards.splice(currentCardIndex, 1)[0];
        learningCards.push(card);
        updateProgressInfo();

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

    // ========== СВАЙПЫ ==========
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

        // Цветовая индикация
        if (diff > 30) {
            $flashcard.addClass('like').removeClass('dislike');
        } else if (diff < -30) {
            $flashcard.addClass('dislike').removeClass('like');
        } else {
            $flashcard.removeClass('like dislike');
        }
    });

    $(document).on('mouseup touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        let diff = currentX - startX;
        $flashcard.css('transform', '').removeClass('like dislike');
        $flashcard.removeClass('dragging');

        if (Math.abs(diff) > 60) { // порог уменьшен до 60px
            if (diff > 0) {
                markKnown();
            } else {
                markUnknown();
            }
        }
    });

    // ========== КНОПКИ ==========
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
    }
});
