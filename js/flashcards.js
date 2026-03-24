$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const allMode = urlParams.get('all') === 'true';
    const group = urlParams.get('group');

    // Отображаемые имена для разделов (без изменений)
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

    const $flashcard = $('.flashcard');
    const $frontImg = $('#frontImg');
    const $backImg = $('#backImg');
    const $questionBtn = $('#question, #question-mobile');
    const $flipBtn = $('#flipCard, #flipCard-mobile');
    const $rememberBtn = $('#rememberBtn');
    const $forgetBtn = $('#forgetBtn');
    const $progressInfo = $('#progressInfo');
    const $sectionTitle = $('#sectionTitle');
    const $helpBtn = $('#helpBtn');

    // ========== МОДАЛЬНОЕ ОКНО ИНСТРУКЦИИ ==========
    // Создаём модальное окно, если его нет
    if (!$('.modal').length) {
        const modalHtml = `
            <div class="modal" id="instructionModal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h3>Как учить карточки</h3>
                    <ul>
                        <li><strong>Запомнил ✅</strong> — карточка удаляется из очереди.</li>
                        <li><strong>Не запомнил ❌</strong> — карточка уходит в конец очереди.</li>
                        <li>Свайп <strong>вправо</strong> = Запомнил, <strong>влево</strong> = Не запомнил.</li>
                        <li>Клик по карточке или кнопка «Посмотреть состав» — перевернуть.</li>
                        <li>Кнопка «Загадать блюдо» — показать случайную карточку (не меняет статус).</li>
                        <li>Прогресс показывает, сколько карточек осталось выучить.</li>
                    </ul>
                </div>
            </div>
        `;
        $('body').append(modalHtml);
    }

    const $modal = $('#instructionModal');
    const $closeModal = $('.close-modal');

    $helpBtn.on('click', () => $modal.css('display', 'flex'));
    $closeModal.on('click', () => $modal.hide());
    $(window).on('click', (e) => {
        if (e.target === $modal[0]) $modal.hide();
    });

    // ========== ЗАГРУЗКА КАРТОЧЕК (оптимизированная) ==========
    function checkImagePair(basePath, index) {
        return new Promise(resolve => {
            const img = new Image();
            img.src = `${basePath}${index}.png`;
            img.onload = () => resolve({
                question: `${basePath}${index}.png`,
                answer: `${basePath}${index + 1}.png`
            });
            img.onerror = () => resolve(null);
        });
    }

    async function loadCardsFromSection(sectionName) {
        const basePath = `../images/${sectionName}/`;
        const MAX = 100;
        const checks = [];
        for (let i = 1; i <= MAX; i += 2) checks.push(checkImagePair(basePath, i));
        const results = await Promise.all(checks);
        return results.filter(Boolean);
    }

    async function loadCardsFromSections(sectionsList, title) {
        $sectionTitle.text(`Загрузка ${title}...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);
        $rememberBtn.prop('disabled', true);
        $forgetBtn.prop('disabled', true);

        const promises = sectionsList.map(loadCardsFromSection);
        const results = await Promise.all(promises);
        allCards = results.flat();

        if (!allCards.length) {
            $sectionTitle.text(`Не найдено карточек для ${title}`);
            return;
        }

        $sectionTitle.text(title);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);
        $rememberBtn.prop('disabled', false);
        $forgetBtn.prop('disabled', false);

        initLearning();
        $flashcard.show();
        showCurrentCard();
    }

    async function loadCardsForSection(sectionName) {
        const displayName = sectionDisplayNames[sectionName] || sectionName;
        $sectionTitle.text(`Загрузка раздела "${displayName}"...`);
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);
        $rememberBtn.prop('disabled', true);
        $forgetBtn.prop('disabled', true);

        allCards = await loadCardsFromSection(sectionName);

        if (!allCards.length) {
            $sectionTitle.text(`Раздел "${displayName}" не содержит карточек`);
            return;
        }

        $sectionTitle.text(`Изучаем раздел: ${displayName}`);
        $questionBtn.prop('disabled', false);
        $flipBtn.prop('disabled', false);
        $rememberBtn.prop('disabled', false);
        $forgetBtn.prop('disabled', false);

        initLearning();
        $flashcard.show();
        showCurrentCard();
    }

    function initLearning() {
        learningCards = [...allCards];
        shuffleArray(learningCards);
        currentCardIndex = 0;
        updateProgressInfo();
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function updateProgressInfo() {
        $progressInfo.text(`Осталось: ${learningCards.length} / ${allCards.length}`);
    }

    function showCurrentCard() {
        if (!learningCards.length) {
            $sectionTitle.text('🎉 Поздравляем! Вы выучили все карточки! 🎉');
            $flashcard.hide();
            $questionBtn.prop('disabled', true);
            $flipBtn.prop('disabled', true);
            $rememberBtn.prop('disabled', true);
            $forgetBtn.prop('disabled', true);
            return;
        }

        const card = learningCards[currentCardIndex];
        if ($flashcard.hasClass('flipped')) {
            $flashcard.removeClass('flipped');
            $flipBtn.text('Посмотреть состав');
            $('#flipCard-mobile').text('Посмотреть состав');
        }
        $frontImg.attr('src', card.question);
        $backImg.attr('src', card.answer);
    }

    function showRandomCard() {
        if (!learningCards.length) return;
        let newIndex = Math.floor(Math.random() * learningCards.length);
        if (newIndex === currentCardIndex && learningCards.length > 1)
            newIndex = (newIndex + 1) % learningCards.length;
        currentCardIndex = newIndex;
        showCurrentCard();
    }

    // ========== ДЕЙСТВИЯ С КАРТОЧКАМИ ==========
    function markKnown() {
        if (!learningCards.length) return;
        learningCards.splice(currentCardIndex, 1);
        updateProgressInfo();
        if (!learningCards.length) {
            showCurrentCard();
            return;
        }
        if (currentCardIndex >= learningCards.length) currentCardIndex = 0;
        animateSwipe('right');
    }

    function markUnknown() {
        if (!learningCards.length) return;
        const card = learningCards.splice(currentCardIndex, 1)[0];
        learningCards.push(card);
        updateProgressInfo();
        if (currentCardIndex >= learningCards.length) currentCardIndex = 0;
        animateSwipe('left');
    }

    function animateSwipe(direction) {
        const className = direction === 'right' ? 'swipe-right' : 'swipe-left';
        $flashcard.addClass(className);
        setTimeout(() => {
            $flashcard.removeClass(className);
            $flashcard.removeClass('like dislike');
            showCurrentCard();
        }, 300);
    }

    // ========== СВАЙП ==========
    $flashcard.on('mousedown touchstart', function(e) {
        if (!learningCards.length) return;
        isDragging = true;
        startX = e.pageX || e.originalEvent.touches[0].pageX;
        currentX = startX;
        $flashcard.addClass('dragging');
    });

    $(document).on('mousemove touchmove', function(e) {
        if (!isDragging) return;
        currentX = e.pageX || e.originalEvent.touches[0].pageX;
        let diff = currentX - startX;
        $flashcard.css('transform', `translateX(${diff}px) rotate(${diff * 0.05}deg)`);
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
        $flashcard.removeClass('dragging');
        let diff = currentX - startX;
        $flashcard.css('transform', '');
        $flashcard.removeClass('like dislike');
        if (Math.abs(diff) > 60) {
            diff > 0 ? markKnown() : markUnknown();
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
    $rememberBtn.on('click', markKnown);
    $forgetBtn.on('click', markUnknown);

    // ========== ЗАПУСК ==========
    if (allMode) {
        loadCardsFromSections(ALL_SECTIONS, 'Все разделы меню');
    } else if (group && GROUPS[group]) {
        let title = group === 'dinner' ? 'Ужин (все блюда)' : 'Бар (все напитки)';
        loadCardsFromSections(GROUPS[group], title);
    } else if (section) {
        loadCardsForSection(section);
    } else {
        $sectionTitle.text('Выберите раздел в меню');
        $flashcard.hide();
        $questionBtn.prop('disabled', true);
        $flipBtn.prop('disabled', true);
        $rememberBtn.prop('disabled', true);
        $forgetBtn.prop('disabled', true);
    }
});
