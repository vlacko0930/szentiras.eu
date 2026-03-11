// Shepherd.js Interactive Tour for Szentírás.eu
// Multi-page tour with automatic navigation

const TOUR_STORAGE_KEY = 'szentiras_tour_state';
const TOUR_COMPLETED_KEY = 'szentiras_tour_completed';
const TOUR_SKIPPED_KEY = 'szentiras_tour_skipped';

document.addEventListener('DOMContentLoaded', function() {
    // Check if tour should be shown
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    const tourSkipped = localStorage.getItem(TOUR_SKIPPED_KEY);
    const tourState = localStorage.getItem(TOUR_STORAGE_KEY);
    
    // Create tour button in navbar
    createTourButton();
    
    // Check if tour is in progress
    if (tourState) {
        const state = JSON.parse(tourState);
        // Wait a bit for page to fully load
        setTimeout(() => continueTour(state), 800);
        return;
    }
    
    // Only auto-start on first visit to homepage
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
    const shouldAutoStart = isHomePage && !tourCompleted && !tourSkipped;
    
    if (shouldAutoStart) {
        setTimeout(() => startTour(), 1000);
    }
});

function createTourButton() {
    // Add help button to navbar
    const navbarNav = document.querySelector('.navbar-nav.ms-auto');
    if (navbarNav) {
        const tourButton = document.createElement('li');
        tourButton.className = 'nav-item';
        tourButton.innerHTML = `
            <a class="nav-link" href="javascript:void(0)" id="startTourButton" title="Interaktív útmutató">
                <i class="bi bi-question-circle"></i>
            </a>
        `;
        navbarNav.insertBefore(tourButton, navbarNav.firstChild);
        
        document.getElementById('startTourButton').addEventListener('click', function() {
            // Clear any previous tour state
            localStorage.removeItem(TOUR_STORAGE_KEY);
            localStorage.removeItem(TOUR_COMPLETED_KEY);
            localStorage.removeItem(TOUR_SKIPPED_KEY);
            
            // Only allow starting from homepage
            const isHomePage = window.location.pathname === '/' || window.location.pathname === '';
            if (!isHomePage) {
                alert('Az útmutató csak a kezdőoldalról indítható. Átirányítunk a főoldalra...');
                window.location.href = '/';
                return;
            }
            
            startTour();
        });
    }
}

function detectPageType() {
    const path = window.location.pathname;
    
    if (path === '/' || path === '') return 'home';
    if (path.includes('/tools/')) return 'tools';
    if (path.includes('/tervek')) return 'plans';
    if (path.includes('/kereses') || path.includes('/search')) return 'search';
    if (path.match(/\/[A-Z]+$/)) return 'translation';
    if (path.match(/\/[A-Z]+\//)) return 'reading';
    
    return 'other';
}

function saveTourState(stepId, nextPage) {
    const state = {
        currentStep: stepId,
        nextPage: nextPage,
        timestamp: Date.now()
    };
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
}

function clearTourState() {
    localStorage.removeItem(TOUR_STORAGE_KEY);
}

function navigateToPage(url, stepId) {
    saveTourState(stepId, url);
    window.location.href = url;
}

function continueTour(state) {
    // Check if state is too old (more than 5 minutes)
    if (Date.now() - state.timestamp > 5 * 60 * 1000) {
        clearTourState();
        return;
    }
    
    const pageType = detectPageType();
    startTourFromStep(state.currentStep, pageType);
}

function startTour() {
    clearTourState();
    startTourFromStep('welcome', 'home');
}

function startTourFromStep(startStepId, pageType) {
    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shepherd-theme-custom',
            scrollTo: { behavior: 'smooth', block: 'center' },
            cancelIcon: {
                enabled: true
            }
        }
    });

    // Handle tour completion
    tour.on('complete', function() {
        clearTourState();
        localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    });

    // Handle tour cancellation
    tour.on('cancel', function() {
        clearTourState();
        localStorage.setItem(TOUR_SKIPPED_KEY, 'true');
    });

    // Build all tour steps in order
    buildMultiPageTour(tour, pageType);

    // Start from specific step or beginning
    tour.start();
    
    if (startStepId !== 'welcome') {
        const step = tour.steps.find(s => s.id === startStepId);
        if (step) {
            tour.show(step.id);
        }
    }
}

function buildMultiPageTour(tour, currentPageType) {
    // Step 1: Welcome (only on home page)
    if (currentPageType === 'home') {
        tour.addStep({
            id: 'welcome',
            title: '👋 Üdvözöllek a Szentírás.eu-n!',
            text: 'Ez az interaktív útmutató végigvezet a weboldal főbb funkcióin több oldalon keresztül. Az útmutató automatikusan navigál majd a különböző oldalak között. Bármikor kiléphetsz az "✕" gombbal.',
            buttons: [
                {
                    text: 'Kihagyom',
                    classes: 'btn btn-secondary',
                    action: function() {
                        clearTourState();
                        localStorage.setItem(TOUR_SKIPPED_KEY, 'true');
                        tour.complete();
                    }
                },
                {
                    text: 'Kezdjük! →',
                    classes: 'btn btn-primary',
                    action: tour.next
                }
            ]
        });
    }

    // Step 2: Read tile (only on home page)
    if (currentPageType === 'home') {
        const readTile = document.querySelector('.col-12.col-lg-6:first-child');
        if (readTile) {
            tour.addStep({
                id: 'read-tile',
                title: '📖 Olvasás',
                text: 'Itt olvashatod a Szentírást. Írd be a hivatkozást (pl. "Jn 3,16" vagy "Róm 8"), és rögtön megjelenik a szöveg. Most megnézzük, hogyan néz ki egy bibliai szöveg!',
                attachTo: {
                    element: readTile,
                    on: 'bottom'
                },
                buttons: [
                    {
                        text: '← Vissza',
                        classes: 'btn btn-secondary',
                        action: tour.back
                    },
                    {
                        text: 'Megnézem →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/KG/Jn 3', 'reading-view');
                        }
                    }
                ]
            });
        }
    }

    // Step 3: Reading view (on reading page)
    if (currentPageType === 'reading') {
        tour.addStep({
            id: 'reading-view',
            title: '📖 Bibliai szöveg',
            text: 'Itt látod János evangéliumának 3. fejezetét. A szöveg olvasható formában jelenik meg, versszámokkal együtt.',
            buttons: [
                {
                    text: 'Tovább →',
                    classes: 'btn btn-primary',
                    action: tour.next
                }
            ]
        });

        // Chapter navigation
        const chapterNav = document.querySelector('.chapter-navigation, .prev-next, nav[aria-label*="fejezet"]');
        if (chapterNav) {
            tour.addStep({
                id: 'chapter-navigation',
                title: '◀️▶️ Fejezetek közötti navigálás',
                text: 'Itt tudsz előre-hátra lépkedni a fejezetek között. Az előző fejezetre a bal, a következőre a jobb nyíllal léphetsz.',
                attachTo: {
                    element: chapterNav,
                    on: 'top'
                },
                buttons: [
                    {
                        text: 'Vissza a főoldalra →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/', 'back-home-1');
                        }
                    }
                ]
            });
        } else {
            tour.addStep({
                id: 'chapter-navigation-skip',
                title: '↩️ Vissza a főoldalra',
                text: 'Most térjünk vissza a főoldalra, hogy megnézzük a többi funkciót is!',
                buttons: [
                    {
                        text: 'Vissza a főoldalra →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/', 'back-home-1');
                        }
                    }
                ]
            });
        }
    }

    // Step 4: Back to home - Search tile
    if (currentPageType === 'home') {
        const searchTile = document.querySelector('.col-12.col-lg-6:nth-child(2)');
        if (searchTile) {
            tour.addStep({
                id: 'back-home-1',
                title: '🔍 Keresés a Szentírásban',
                text: 'Kereshetsz szavakra, kifejezésekre a teljes Szentírásban vagy kiválasztott könyvekben. Most keressünk rá a "szeretet" szóra!',
                attachTo: {
                    element: searchTile,
                    on: 'bottom'
                },
                buttons: [
                    {
                        text: 'Keresés indítása →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/kereses?q=szeretet', 'search-results');
                        }
                    }
                ]
            });
        }
    }

    // Step 5: Search results
    if (currentPageType === 'search') {
        tour.addStep({
            id: 'search-results',
            title: '🔍 Keresési találatok',
            text: 'Itt látod a "szeretet" szóra való keresés találatait. A találatok versek szerinti bontásban jelennek meg, és rákattintva olvashatod a teljes szöveget.',
            buttons: [
                {
                    text: 'Tovább →',
                    classes: 'btn btn-primary',
                    action: tour.next
                }
            ]
        });

        const searchFilters = document.querySelector('.search-filters, .filter-options, form select');
        if (searchFilters) {
            tour.addStep({
                id: 'search-filters',
                title: '🎯 Szűrési lehetőségek',
                text: 'Szűkítheted a keresést kiválasztott könyvekre vagy szövegrészekre. Így gyorsabban megtalálod, amit keresel!',
                attachTo: {
                    element: searchFilters,
                    on: 'top'
                },
                buttons: [
                    {
                        text: 'Vissza a főoldalra →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/', 'back-home-2');
                        }
                    }
                ]
            });
        } else {
            tour.addStep({
                id: 'search-filters-skip',
                title: '↩️ Vissza a főoldalra',
                text: 'Most térjünk vissza, hogy megnézzük a többi funkciót is!',
                buttons: [
                    {
                        text: 'Vissza a főoldalra →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/', 'back-home-2');
                        }
                    }
                ]
            });
        }
    }

    // Step 6: Testament tiles
    if (currentPageType === 'home') {
        const newTestamentTile = document.querySelector('.col-12.col-md-6.col-lg-3:nth-child(1)');
        if (newTestamentTile) {
            tour.addStep({
                id: 'back-home-2',
                title: '📚 Könyvek gyors elérése',
                text: 'Itt találod az Újszövetség, az Ószövetség és a Zsoltárok könyveit. Egy kattintással ugorhatsz bármelyik könyvhöz, és ott fejezetet választhatsz.',
                attachTo: {
                    element: newTestamentTile,
                    on: 'top'
                },
                buttons: [
                    {
                        text: 'Tovább →',
                        classes: 'btn btn-primary',
                        action: tour.next
                    }
                ]
            });
        }
    }

    // Step 7: Tools section
    if (currentPageType === 'home') {
        const toolsCard = document.querySelector('a[href*="/tools"]');
        if (toolsCard) {
            tour.addStep({
                id: 'tools-section',
                title: '🎮 Eszközök és játékok',
                text: 'Kipróbálhatod az interaktív játékainkat: memóriajáték, kvíz, verskirakó és még sok más! Tanulj játékosan a Szentírásból! Nézzünk meg egy eszközt!',
                attachTo: {
                    element: toolsCard.closest('.col'),
                    on: 'top'
                },
                buttons: [
                    {
                        text: 'Eszközök megtekintése →',
                        classes: 'btn btn-primary',
                        action: function() {
                            navigateToPage('/tools', 'tools-page');
                        }
                    }
                ]
            });
        }
    }

    // Step 8: Tools page
    if (currentPageType === 'tools') {
        tour.addStep({
            id: 'tools-page',
            title: '🎮 Interaktív eszközök',
            text: 'Itt találod az összes játékunkat és segédeszközt. Minden játék a Szentírás jobb megismerését szolgálja. Kipróbálhatod őket bármikor!',
            buttons: [
                {
                    text: 'Vissza a főoldalra →',
                    classes: 'btn btn-primary',
                    action: function() {
                        navigateToPage('/', 'back-home-3');
                    }
                }
            ]
        });
    }

    // Step 9: Reading plans
    if (currentPageType === 'home') {
        const plansLink = document.querySelector('a[href="/tervek"]');
        if (plansLink) {
            tour.addStep({
                id: 'back-home-3',
                title: '📅 Olvasási tervek',
                text: 'Napi olvasási tervekkel rendszeresen olvashatsz a Bibliából. Válassz egy tervet, és kövesd végig egy strukturált olvasási programot - akár egy éven át!',
                attachTo: {
                    element: plansLink.closest('.col'),
                    on: 'top'
                },
                buttons: [
                    {
                        text: 'Tovább →',
                        classes: 'btn btn-primary',
                        action: tour.next
                    }
                ]
            });
        }
    }

    // Step 10: Navigation menu
    if (currentPageType === 'home') {
        const navbarBrand = document.querySelector('.navbar-brand');
        if (navbarBrand) {
            tour.addStep({
                id: 'navbar',
                title: '🧭 Navigáció',
                text: 'A felső menüben találod a Fordítások listáját, az Olvasási terveket, az Eszközöket, és egyéb hasznos linkeket. A Szentírás.eu logóra kattintva bármikor visszatérhetsz a főoldalra.',
                attachTo: {
                    element: navbarBrand.parentElement,
                    on: 'bottom'
                },
                buttons: [
                    {
                        text: 'Tovább →',
                        classes: 'btn btn-primary',
                        action: tour.next
                    }
                ]
            });
        }
    }

    // Step 11: Theme toggle
    if (currentPageType === 'home') {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            tour.addStep({
                id: 'theme-toggle',
                title: '🌓 Sötét/világos mód',
                text: 'Válthatsz a világos és sötét megjelenítés között a szemed kíméléséért. Három lehetőséged van: világos, sötét, vagy automatikus (rendszer beállítás szerint). Próbáld ki!',
                attachTo: {
                    element: themeToggle,
                    on: 'bottom'
                },
                buttons: [
                    {
                        text: 'Tovább →',
                        classes: 'btn btn-primary',
                        action: tour.next
                    }
                ]
            });
        }
    }

    // Final step
    if (currentPageType === 'home') {
        tour.addStep({
            id: 'complete',
            title: '🎉 Kész!',
            text: 'Most már ismered a főbb funkciókat! Jártunk az olvasó nézetben, kerestünk szavakat, megnéztük az eszközöket. Jó böngészést és áldott időt kívánunk az Isten Igéjével!',
            buttons: [
                {
                    text: 'Bezárás',
                    classes: 'btn btn-success',
                    action: function() {
                        clearTourState();
                        localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
                        tour.complete();
                    }
                }
            ]
        });
    }
}

// Export for manual triggering
window.startSzentirasOldalTour = startTour;
