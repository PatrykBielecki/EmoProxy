export const LOCALES = ['en', 'pl'] as const;
export type Locale = (typeof LOCALES)[number];

export type TranslationKey =
  | 'language.label'
  | 'language.english'
  | 'language.polish'
  | 'common.loading'
  | 'common.back'
  | 'survey.loadFailed'
  | 'survey.incompleteConfig'
  | 'survey.title'
  | 'survey.intro1'
  | 'survey.intro2'
  | 'survey.intro3'
  | 'survey.intro4'
  | 'survey.start'
  | 'survey.emotion'
  | 'survey.stepCreate'
  | 'survey.shape'
  | 'survey.animationType'
  | 'survey.size'
  | 'survey.speed'
  | 'survey.valence'
  | 'survey.arousal'
  | 'survey.dominance'
  | 'survey.continueVad'
  | 'survey.nextEmotion'
  | 'survey.rateAnimation'
  | 'survey.stepVad'
  | 'survey.noEmotionLabel'
  | 'survey.continueDemographics'
  | 'survey.nextAnimation'
  | 'survey.preparingAnimations'
  | 'survey.thankYouTitle'
  | 'survey.thankYouDesc'
  | 'survey.userDetailsTitle'
  | 'survey.userDetailsDesc'
  | 'survey.age'
  | 'survey.country'
  | 'survey.gender'
  | 'survey.submit'
  | 'survey.submitting'
  | 'survey.submitFailed'
  | 'gender.placeholder'
  | 'gender.male'
  | 'gender.female'
  | 'gender.preferNotToSay'
  | 'gender.different'
  | 'admin.loginTitle'
  | 'admin.username'
  | 'admin.password'
  | 'admin.signingIn'
  | 'admin.signIn'
  | 'admin.loginFailed'
  | 'admin.checkingSession'
  | 'admin.redirecting'
  | 'admin.panel'
  | 'admin.loggedInAs'
  | 'admin.unsavedChanges'
  | 'admin.logout'
  | 'admin.tab.configuration'
  | 'admin.tab.responses'
  | 'admin.tab.analytics'
  | 'admin.tab.exportStats'
  | 'analytics.title'
  | 'analytics.filterSettings'
  | 'analytics.enableOutlierFiltering'
  | 'analytics.zScoreThreshold'
  | 'analytics.saveSettings'
  | 'analytics.respondentSummary'
  | 'analytics.sessions'
  | 'analytics.totalResponses'
  | 'analytics.accepted'
  | 'analytics.rejected'
  | 'analytics.ageMeanSd'
  | 'analytics.ageRange'
  | 'analytics.vadMeansChart'
  | 'analytics.genderDistributionChart'
  | 'analytics.countryDistributionChart'
  | 'analytics.sizeMeanChart'
  | 'analytics.speedMeanChart'
  | 'analytics.sizeChartNote'
  | 'analytics.speedChartNote'
  | 'analytics.vadRadarChart'
  | 'analytics.vadStatsTable'
  | 'analytics.vadMappingTable'
  | 'analytics.correlationMatrix'
  | 'analytics.emotionParamMatrix'
  | 'analytics.shapeStats'
  | 'analytics.animationStats'
  | 'analytics.colorFamilyStats'
  | 'analytics.genderStats'
  | 'analytics.countryStats'
  | 'analytics.insights'
  | 'analytics.colorFamilyClassification'
  | 'analytics.colorFamilyClassificationDesc'
  | 'analytics.tableFootnote'
  | 'analytics.col.emotion'
  | 'analytics.col.count'
  | 'analytics.col.share'
  | 'analytics.col.valenceMean'
  | 'analytics.col.valenceSD'
  | 'analytics.col.valenceMedian'
  | 'analytics.col.arousalMean'
  | 'analytics.col.arousalSD'
  | 'analytics.col.arousalMedian'
  | 'analytics.col.dominanceMean'
  | 'analytics.col.dominanceSD'
  | 'analytics.col.dominanceMedian'
  | 'analytics.col.sizeMean'
  | 'analytics.col.sizeSD'
  | 'analytics.col.speedMean'
  | 'analytics.col.speedSD'
  | 'analytics.col.sizeMeanSD'
  | 'analytics.col.speedMeanSD'
  | 'analytics.col.gender'
  | 'analytics.col.country'
  | 'analytics.col.key'
  | 'analytics.col.topColorFamily'
  | 'analytics.col.topShape'
  | 'analytics.col.topAnimation'
  | 'analytics.col.centroidV'
  | 'analytics.col.centroidA'
  | 'analytics.col.centroidD'
  | 'analytics.col.nearestEmotion'
  | 'analytics.col.vadDistance'
  | 'analytics.col.hRange'
  | 'analytics.col.sMin'
  | 'analytics.col.vMin'
  | 'analytics.col.preview';

type TranslationDict = Record<TranslationKey, string>;

const EN: TranslationDict = {
  'language.label': 'Language',
  'language.english': 'English',
  'language.polish': 'Polish',
  'common.loading': 'Loading...',
  'common.back': 'Back',
  'survey.loadFailed': 'Failed to load survey configuration.',
  'survey.incompleteConfig': 'Survey configuration is incomplete.',
  'survey.title': 'EmoProxy',
  'survey.intro1': 'Participate in a study that helps us better understand emotions.',
  'survey.intro2':
    "An emotion, such as ‘joy’ or ‘anger,’ will be displayed at the top of the page. Your task is to configure the animation parameters to best reflect this emotion.",
  'survey.intro3': 'The purpose of this study is to understand how different visual parameters can be used to express emotions.',
  'survey.intro4': 'Thank you for participating in this study. Your input is invaluable to us!',
  'survey.start': 'Start survey',
  'survey.emotion': 'Emotion',
  'survey.stepCreate': 'Step 2/4 · Animation creation',
  'survey.shape': 'Shape',
  'survey.animationType': 'Animation type',
  'survey.size': 'Size',
  'survey.speed': 'Speed',
  'survey.valence': 'Valence',
  'survey.arousal': 'Arousal',
  'survey.dominance': 'Dominance',
  'survey.continueVad': 'Continue to VAD ratings',
  'survey.nextEmotion': 'Next emotion',
  'survey.rateAnimation': 'Rate this animation',
  'survey.stepVad': 'Step 3/4 · VAD rating',
  'survey.noEmotionLabel': 'No emotion label is shown in this step.',
  'survey.continueDemographics': 'Finish survey',
  'survey.nextAnimation': 'Next animation',
  'survey.preparingAnimations': 'Preparing animations for rating...',
  'survey.thankYouTitle': 'Thank you!',
  'survey.thankYouDesc': 'Your survey has been submitted successfully. This session is now closed.',
  'survey.userDetailsTitle': 'User details (optional)',
  'survey.userDetailsDesc': 'Please provide your details if you want to. You can skip anything.',
  'survey.age': 'Age',
  'survey.country': 'Country',
  'survey.gender': 'Gender',
  'survey.submit': 'Submit',
  'survey.submitting': 'Submitting...',
  'survey.submitFailed': 'Submission failed.',
  'gender.placeholder': 'Gender',
  'gender.male': 'Male',
  'gender.female': 'Female',
  'gender.preferNotToSay': 'Prefer not to say',
  'gender.different': 'Different',
  'admin.loginTitle': 'EmoProxy',
  'admin.username': 'Username',
  'admin.password': 'Password',
  'admin.signingIn': 'Signing in...',
  'admin.signIn': 'Sign in',
  'admin.loginFailed': 'Login failed.',
  'admin.checkingSession': 'Checking session...',
  'admin.redirecting': 'Redirecting...',
  'admin.panel': 'EmoProxy',
  'admin.loggedInAs': 'Logged in as',
  'admin.unsavedChanges': 'You have unsaved changes.',
  'admin.logout': 'Logout',
  'admin.tab.configuration': 'Configuration',
  'admin.tab.responses': 'Responses',
  'admin.tab.analytics': 'Analytics',
  'admin.tab.exportStats': 'Data & Statistics Export',
  'analytics.title': 'Advanced statistics',
  'analytics.filterSettings': 'Filter settings',
  'analytics.enableOutlierFiltering': 'Enable outlier filtering',
  'analytics.zScoreThreshold': 'Z-score threshold',
  'analytics.saveSettings': 'Save settings',
  'analytics.respondentSummary': 'Respondent summary',
  'analytics.sessions': 'Sessions (respondents)',
  'analytics.totalResponses': 'Total responses',
  'analytics.accepted': 'Accepted',
  'analytics.rejected': 'Rejected (outliers)',
  'analytics.ageMeanSd': 'Age: mean ± SD',
  'analytics.ageRange': 'Age: range',
  'analytics.vadMeansChart': 'Mean VAD per emotion',
  'analytics.genderDistributionChart': 'Gender distribution of respondents',
  'analytics.countryDistributionChart': 'Country distribution of respondents',
  'analytics.sizeMeanChart': 'Average Size per emotion (scale)',
  'analytics.speedMeanChart': 'Average Speed per emotion (scale)',
  'analytics.sizeChartNote': 'Values displayed in scale units (config range: {min}–{max}). Raw data stored in pixels.',
  'analytics.speedChartNote': 'Values displayed in scale units (config range: {min}–{max}). Raw data stored as speed factor.',
  'analytics.vadRadarChart': 'VAD centroids per emotion (Radar)',
  'analytics.vadStatsTable': 'VAD statistics per emotion (mean ± SD, median)',
  'analytics.vadMappingTable': 'VAD label mapping – centroids and nearest neighbor',
  'analytics.correlationMatrix': 'Pearson correlation matrix (numeric parameters + per-shape/animation binary indicators)',
  'analytics.emotionParamMatrix': 'Emotion × parameter matrix (top values per emotion)',
  'analytics.shapeStats': 'Shape statistics',
  'analytics.animationStats': 'Animation statistics',
  'analytics.colorFamilyStats': 'Color family statistics',
  'analytics.genderStats': 'Statistics by gender',
  'analytics.countryStats': 'Statistics by country',
  'analytics.insights': 'Insights',
  'analytics.colorFamilyClassification': 'Color family classification (HSV ranges)',
  'analytics.colorFamilyClassificationDesc': 'Colors are classified into families based on HSV components: H=Hue (0–360°), S=Saturation (0–1), V=Value/Brightness (0–1). Low saturation (S<0.12) → neutral families; otherwise hue determines the family.',
  'analytics.tableFootnote': 'V=Valence, A=Arousal, D=Dominance · n=number of responses · SD=standard deviation · mean=arithmetic mean · med=median',
  'analytics.col.emotion': 'Emotion',
  'analytics.col.count': 'n',
  'analytics.col.share': 'Share %',
  'analytics.col.valenceMean': 'V mean',
  'analytics.col.valenceSD': 'V SD',
  'analytics.col.valenceMedian': 'V med',
  'analytics.col.arousalMean': 'A mean',
  'analytics.col.arousalSD': 'A SD',
  'analytics.col.arousalMedian': 'A med',
  'analytics.col.dominanceMean': 'D mean',
  'analytics.col.dominanceSD': 'D SD',
  'analytics.col.dominanceMedian': 'D med',
  'analytics.col.sizeMean': 'Size mean',
  'analytics.col.sizeSD': 'Size SD',
  'analytics.col.speedMean': 'Speed mean',
  'analytics.col.speedSD': 'Speed SD',
  'analytics.col.sizeMeanSD': 'Size mean±SD',
  'analytics.col.speedMeanSD': 'Speed mean±SD',
  'analytics.col.gender': 'Gender',
  'analytics.col.country': 'Country',
  'analytics.col.key': 'Key',
  'analytics.col.topColorFamily': 'Top color family',
  'analytics.col.topShape': 'Top shape',
  'analytics.col.topAnimation': 'Top animation',
  'analytics.col.centroidV': 'Centroid V',
  'analytics.col.centroidA': 'Centroid A',
  'analytics.col.centroidD': 'Centroid D',
  'analytics.col.nearestEmotion': 'Nearest emotion',
  'analytics.col.vadDistance': 'VAD distance',
  'analytics.col.hRange': 'H range (hue °)',
  'analytics.col.sMin': 'S min',
  'analytics.col.vMin': 'V min',
  'analytics.col.preview': 'Preview'
};

const PL: TranslationDict = {
  'language.label': 'Język',
  'language.english': 'Angielski',
  'language.polish': 'Polski',
  'common.loading': 'Ładowanie...',
  'common.back': 'Wstecz',
  'survey.loadFailed': 'Nie udało się wczytać konfiguracji ankiety.',
  'survey.incompleteConfig': 'Konfiguracja ankiety jest niekompletna.',
  'survey.title': 'EmoProxy',
  'survey.intro1': 'Weź udział w badaniu, które pomaga lepiej zrozumieć emocje.',
  'survey.intro2':
    'Na górze strony pojawi się emocja, np. „radość” lub „złość”. Twoim zadaniem jest skonfigurowanie parametrów animacji tak, aby jak najlepiej oddawały tę emocję.',
  'survey.intro3': 'Celem badania jest zrozumienie, jak różne parametry wizualne mogą wyrażać emocje.',
  'survey.intro4': 'Dziękujemy za udział w badaniu. Twój wkład jest dla nas bardzo cenny!',
  'survey.start': 'Rozpocznij ankietę',
  'survey.emotion': 'Emocja',
  'survey.stepCreate': 'Krok 2/4 · Tworzenie animacji',
  'survey.shape': 'Kształt',
  'survey.animationType': 'Typ animacji',
  'survey.size': 'Rozmiar',
  'survey.speed': 'Prędkość',
  'survey.valence': 'Walencja',
  'survey.arousal': 'Pobudzenie',
  'survey.dominance': 'Dominacja',
  'survey.continueVad': 'Przejdź do oceny VAD',
  'survey.nextEmotion': 'Następna emocja',
  'survey.rateAnimation': 'Oceń tę animację',
  'survey.stepVad': 'Krok 3/4 · Ocena VAD',
  'survey.noEmotionLabel': 'W tym kroku etykieta emocji nie jest pokazywana.',
  'survey.continueDemographics': 'Zakończ ankietę',
  'survey.nextAnimation': 'Następna animacja',
  'survey.preparingAnimations': 'Przygotowywanie animacji do oceny...',
  'survey.thankYouTitle': 'Dziękujemy!',
  'survey.thankYouDesc': 'Twoja ankieta została pomyślnie wysłana. Ta sesja jest już zamknięta.',
  'survey.userDetailsTitle': 'Dane użytkownika (opcjonalnie)',
  'survey.userDetailsDesc': 'Jeśli chcesz, podaj swoje dane. Każde pole możesz pominąć.',
  'survey.age': 'Wiek',
  'survey.country': 'Kraj',
  'survey.gender': 'Płeć',
  'survey.submit': 'Wyślij',
  'survey.submitting': 'Wysyłanie...',
  'survey.submitFailed': 'Nie udało się wysłać odpowiedzi.',
  'gender.placeholder': 'Płeć',
  'gender.male': 'Mężczyzna',
  'gender.female': 'Kobieta',
  'gender.preferNotToSay': 'Wolę nie podawać',
  'gender.different': 'Inna',
  'admin.loginTitle': 'EmoProxy',
  'admin.username': 'Nazwa użytkownika',
  'admin.password': 'Hasło',
  'admin.signingIn': 'Logowanie...',
  'admin.signIn': 'Zaloguj',
  'admin.loginFailed': 'Logowanie nie powiodło się.',
  'admin.checkingSession': 'Sprawdzanie sesji...',
  'admin.redirecting': 'Przekierowywanie...',
  'admin.panel': 'EmoProxy',
  'admin.loggedInAs': 'Zalogowano jako',
  'admin.unsavedChanges': 'Masz niezapisane zmiany.',
  'admin.logout': 'Wyloguj',
  'admin.tab.configuration': 'Konfiguracja',
  'admin.tab.responses': 'Odpowiedzi',
  'admin.tab.analytics': 'Analityka',
  'admin.tab.exportStats': 'Eksport danych i statystyk',
  'analytics.title': 'Zaawansowane statystyki',
  'analytics.filterSettings': 'Ustawienia filtrowania',
  'analytics.enableOutlierFiltering': 'Włącz filtrowanie wartości skrajnych',
  'analytics.zScoreThreshold': 'Próg z-score',
  'analytics.saveSettings': 'Zapisz ustawienia',
  'analytics.respondentSummary': 'Podsumowanie respondentów',
  'analytics.sessions': 'Sesji (respondentów)',
  'analytics.totalResponses': 'Odpowiedzi łącznie',
  'analytics.accepted': 'Zaakceptowanych',
  'analytics.rejected': 'Odrzuconych (outliery)',
  'analytics.ageMeanSd': 'Wiek: średnia ± SD',
  'analytics.ageRange': 'Wiek: zakres',
  'analytics.vadMeansChart': 'Średnie VAD per emocja',
  'analytics.genderDistributionChart': 'Rozkład płci respondentów',
  'analytics.countryDistributionChart': 'Rozkład krajów respondentów',
  'analytics.sizeMeanChart': 'Średni rozmiar per emocja (skala)',
  'analytics.speedMeanChart': 'Średnia prędkość per emocja (skala)',
  'analytics.sizeChartNote': 'Wartości w jednostkach skali (zakres konfiguracji: {min}–{max}). Surowe dane przechowywane w pikselach.',
  'analytics.speedChartNote': 'Wartości w jednostkach skali (zakres konfiguracji: {min}–{max}). Surowe dane przechowywane jako współczynnik prędkości.',
  'analytics.vadRadarChart': 'Centroidy VAD per emocja (Radar)',
  'analytics.vadStatsTable': 'Statystyki VAD per emocja (średnia ± SD, mediana)',
  'analytics.vadMappingTable': 'Rzutowanie etykiet na model VAD – centroidy i najbliższy sąsiad',
  'analytics.correlationMatrix': 'Macierz korelacji Pearsona (parametry numeryczne + wskaźniki binarne kształt/animacja)',
  'analytics.emotionParamMatrix': 'Macierz emocja × parametr (top wartości per emocja)',
  'analytics.shapeStats': 'Statystyki kształtów',
  'analytics.animationStats': 'Statystyki animacji',
  'analytics.colorFamilyStats': 'Statystyki rodzin kolorów',
  'analytics.genderStats': 'Statystyki według płci',
  'analytics.countryStats': 'Statystyki według kraju',
  'analytics.insights': 'Spostrzeżenia',
  'analytics.colorFamilyClassification': 'Klasyfikacja rodzin kolorów (zakresy HSV)',
  'analytics.colorFamilyClassificationDesc': 'Kolory są klasyfikowane na rodziny na podstawie składowych HSV: H=odcień (0–360°), S=nasycenie (0–1), V=jasność (0–1). Niskie nasycenie (S<0.12) → rodziny neutralne; w pozostałych przypadkach odcień wyznacza rodzinę.',
  'analytics.tableFootnote': 'V=Walencja, A=Pobudzenie, D=Dominacja · n=liczba odpowiedzi · SD=odchylenie standardowe · mean=średnia arytmetyczna · med=mediana',
  'analytics.col.emotion': 'Emocja',
  'analytics.col.count': 'n',
  'analytics.col.share': 'Udział %',
  'analytics.col.valenceMean': 'V mean',
  'analytics.col.valenceSD': 'V SD',
  'analytics.col.valenceMedian': 'V med',
  'analytics.col.arousalMean': 'A mean',
  'analytics.col.arousalSD': 'A SD',
  'analytics.col.arousalMedian': 'A med',
  'analytics.col.dominanceMean': 'D mean',
  'analytics.col.dominanceSD': 'D SD',
  'analytics.col.dominanceMedian': 'D med',
  'analytics.col.sizeMean': 'Size mean',
  'analytics.col.sizeSD': 'Size SD',
  'analytics.col.speedMean': 'Speed mean',
  'analytics.col.speedSD': 'Speed SD',
  'analytics.col.sizeMeanSD': 'Size mean±SD',
  'analytics.col.speedMeanSD': 'Speed mean±SD',
  'analytics.col.gender': 'Płeć',
  'analytics.col.country': 'Kraj',
  'analytics.col.key': 'Klucz',
  'analytics.col.topColorFamily': 'Top rodzina kolorów',
  'analytics.col.topShape': 'Top kształt',
  'analytics.col.topAnimation': 'Top animacja',
  'analytics.col.centroidV': 'Centroid V',
  'analytics.col.centroidA': 'Centroid A',
  'analytics.col.centroidD': 'Centroid D',
  'analytics.col.nearestEmotion': 'Najbliższa emocja',
  'analytics.col.vadDistance': 'Odległość VAD',
  'analytics.col.hRange': 'Zakres H (odcień °)',
  'analytics.col.sMin': 'S min',
  'analytics.col.vMin': 'V min',
  'analytics.col.preview': 'Podgląd'
};

export const TRANSLATIONS: Record<Locale, TranslationDict> = {
  en: EN,
  pl: PL
};
