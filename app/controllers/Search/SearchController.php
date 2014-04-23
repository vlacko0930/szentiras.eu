<?php

namespace SzentirasHu\Controllers\Search;
use App;
use BaseController;
use Input;
use Sphinx\SphinxClient;
use SphinxSearch;
use SzentirasHu\Controllers\Display\TextDisplayController;
use SzentirasHu\Lib\Reference\CanonicalReference;
use SzentirasHu\Lib\Reference\ParsingException;
use SzentirasHu\Models\Entities\Book;
use SzentirasHu\Models\Entities\Translation;
use SzentirasHu\Models\Repositories\BookRepository;
use SzentirasHu\Models\Repositories\TranslationRepository;
use SzentirasHu\Models\Repositories\VerseRepository;
use View;

/**
 * Controller for searching. Based on REST conventions.
 *
 * @author berti
 */
class SearchController extends BaseController {

    /**
     * @var BookRepository
     */
    private $bookRepository;

    /**
     * @var TranslationRepository
     */
    private $translationRepository;
    /**
     * @var \SzentirasHu\Models\Repositories\VerseRepository
     */
    private $verseRepository;

    function __construct(BookRepository $bookRepository, TranslationRepository $translationRepository, VerseRepository $verseRepository)
    {
        $this->bookRepository = $bookRepository;
        $this->translationRepository = $translationRepository;
        $this->verseRepository = $verseRepository;
    }

    public function getIndex() {
        return $this->getView($this->prepareForm());
    }

    public function postSearch() {
        if (Input::get('textToSearch') == null) {
            return $this->getIndex();
        }
        $form = $this->prepareForm();
        $view = $this->getView($form);
        $view = $this->searchBookRef($form, $view);
        $view = $this->searchFullText($form, $view);
        return $view;
    }

    /**
     * @return SearchForm
     */
    private function prepareForm() {
        $form = new SearchForm();
        $form->textToSearch = Input::get('textToSearch');
        $form->grouping = Input::get('grouping');
        $defaultTranslation = Translation::getDefaultTranslation();
        $form->book = Input::has('book') ? Input::get('book') : 0;
        $form->translation = Input::has('translation') ? Translation::find(Input::get('translation')) : $defaultTranslation;
        return $form;
    }

    private function getView($form) {
        $translations = $this->translationRepository->getAll();
        $books = $this->bookRepository->getBooksByTranslation(Translation::getDefaultTranslation()->id);
        return View::make("search.search", [
            'form' => $form,
            'translations' => $translations,
            'books' => $books
        ]);
    }

    /**
     * @param $form
     * @param $view
     * @return mixed
     */
    private function searchBookRef($form, $view)
    {
        $augmentedView = $view;
        try {
            $storedBookRef = CanonicalReference::fromString($form->textToSearch)->getExistingBookRef();
            if ($storedBookRef) {
                $translatedRef = CanonicalReference::translateBookRef($storedBookRef, $form->translation->id);
                $textDisplayController = App::make('SzentirasHu\Controllers\Display\TextDisplayController');
                $verseContainers = $textDisplayController->getTranslatedVerses(CanonicalReference::fromString($form->textToSearch), $form->translation);
                $augmentedView = $view->with('bookRef', [
                    'label' => $translatedRef->toString(),
                    'link' => "/{$form->translation->abbrev}/{$translatedRef->toString()}",
                    'verseContainers' => $verseContainers
                ]);
            }
        } catch (ParsingException $e) {
        }
        return $augmentedView;
    }

    /**
     * @param $form
     * @param $view
     * @return mixed
     */
    private function searchFullText($form, $view)
    {
        $fullTextResults = SphinxSearch::
        search($form->textToSearch)
            ->limit(1000)
            ->filter('trans', $form->translation->id)
            ->setMatchMode(SphinxClient::SPH_MATCH_EXTENDED)
            ->setSortMode(SphinxClient::SPH_SORT_EXTENDED, "@relevance DESC, gepi ASC")
            ->get();
        if ($fullTextResults) {
            $sortedVerses = $this->verseRepository->getVersesInOrder(array_keys($fullTextResults['matches']));
            $view = $view->with('fullTextResults', $sortedVerses);
        }
        return $view;
    }

}
