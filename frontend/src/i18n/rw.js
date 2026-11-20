// Kinyarwanda texts. Same keys as en.js. A missing key falls back to English.
// TODO(translation review): EVERY text in this file is a first draft and must be checked by a
// native Kinyarwanda speaker before the pilot. Lines marked "TODO: unsure" are the least certain.
const rw = {
  app: { name: 'Smart Green Hub', tagline: 'Gutoshya Kigali' }, // TODO: unsure
  common: {
    save: 'Bika',
    saving: 'Birabikwa…',
    cancel: 'Reka',
    back: 'Subira inyuma',
    loading: 'Biraza…',
    signIn: 'Injira',
    signOut: 'Sohoka',
    register: 'Iyandikishe',
    menu: 'Ibikubiyemo', // TODO: unsure
    quickMenu: "Amapaji y'ingenzi", // TODO: unsure
    close: 'Funga',
    optional: 'si ngombwa',
    language: 'Ururimi',
    tryAgain: 'Ongera ugerageze',
    skipToContent: 'Jya ku bikubiye mu ipaji',
    all: 'Byose',
    plants: 'ingemwe',
    confirm: 'Emeza',
  },
  connection: { online: 'Kuri interineti', offline: 'Nta interineti' },
  roles: { operator: "Nyir'ipepiniyeri", institution: 'Ikigo cyakira ibimera', admin: 'Umuyobozi' }, // TODO: unsure
  districts: { Gasabo: 'Gasabo', Kicukiro: 'Kicukiro', Nyarugenge: 'Nyarugenge' },
  orgTypes: {
    school: 'Ishuri',
    sector_office: "Ibiro by'umurenge",
    church: 'Itorero / Kiliziya',
    hotel: 'Hoteli',
    community_group: "Itsinda ry'abaturage ritera ibiti", // TODO: unsure
  },
  verification: { pending: 'Bitegereje kwemezwa', approved: 'Byemejwe', rejected: 'Bikeneye gukosorwa' },
  risk: { low: 'Hasi', medium: 'Hagati', high: 'Hejuru' }, // TODO: unsure (risk levels)
  stages: { seedling: 'Ingemwe nto', growing: 'Irakura', ready: 'Yiteguye', overgrown: 'Yarenze igihe', cleared: 'Yarangiye' }, // TODO: unsure
  alertStatus: { open: 'Gifunguye', acknowledged: 'Cyabonywe', resolved: 'Cyakemutse', dismissed: 'Cyirengagijwe' }, // TODO: unsure
  listingStatus: { active: 'Kiraboneka', reserved: 'Cyafashwe', fulfilled: 'Cyatanzwe', expired: 'Cyarangiye', withdrawn: 'Cyakuweho' }, // TODO: unsure
  supportStatus: { open: 'Bifunguye', in_progress: 'Biri gukorwaho', resolved: 'Byakemuwe' }, // TODO: Kinyarwanda to review
  requestStatus: { pending: 'Bitegereje', approved: 'Byemejwe', fulfilled: 'Byarangiye', declined: 'Byanzwe', cancelled: 'Byahagaritswe' },
  actions: {
    reduce_or_discount: 'Gabanya ibyo uzatera ubutaha cyangwa ugabanye igiciro',
    discount_or_transplant: 'Gabanya igiciro cyangwa wimure ingemwe',
    surplus_board_or_donate: "Shyira ku rubuga rw'ibirenze cyangwa ubitange", // TODO: unsure
  },
  categories: { flower: 'Indabo', tree: 'Ibiti', shrub: 'Ibihuru', other: 'Ibindi bimera' },
  expenseCategories: {
    seeds: "Imbuto n'ingemwe",
    fertiliser: "Ifumbire n'imborera",
    pesticide: "Kurwanya ibyonnyi",
    water: 'Amazi',
    labour: 'Abakozi',
    transport: 'Ingendo / gutwara',
    tools: "Ibikoresho n'inkono",
    rent: "Ubukode bw'ubutaka",
    other: 'Ibindi',
  },
  nav: {
    home: 'Ahabanza',
    batches: "Ibyiciro by'ingemwe", // TODO: unsure ("batches")
    salesExpenses: "Ibyagurishijwe n'ibyakoreshejwe",
    salesShort: 'Igurisha', // TODO: unsure
    alerts: 'Imiburo',
    planting: 'Gahunda yo gutera',
    surplusBoard: 'Ibimera birenze', // TODO: unsure ("Surplus Board")
    requests: 'Ubusabe',
    impact: 'Umusaruro', // TODO: unsure ("Impact")
    settings: 'Igenamiterere',
    dashboard: 'Incamake',
    verification: 'Ibitegereje kwemezwa',
    verificationShort: 'Kwemeza',
    rules: "Amategeko n'amoko",
    rulesShort: 'Amategeko',
    listings: "Amatangazo n'ingemwe", // TODO: Kinyarwanda to review
    audit: "Amateka y'ibikorwa",
    emailProblems: 'Imeri zitagezeyo', // TODO: unsure
    sales: 'Igurisha', // TODO: unsure
    expenses: 'Ibyakoreshejwe',
    sync: 'Guhuza', // TODO: unsure
    myRequests: 'Ubusabe bwanjye',
    boardShort: 'Ibimera', // TODO: unsure
    speciesRequests: "Ubusabe bw'amoko", // TODO: Kinyarwanda to review
    nurseries: 'Pepiniyeri', // TODO: Kinyarwanda to review
    institutions: 'Ibigo', // TODO: Kinyarwanda to review
    help: 'Ubufasha', // TODO: Kinyarwanda to review
    support: 'Ubufasha', // TODO: Kinyarwanda to review
    waitingCount: '{n} bitegereje', // TODO: Kinyarwanda to review
  },
  navGroups: {
    review: 'Isuzuma', // TODO: unsure
    manage: 'Gucunga', // TODO: unsure
    settings: 'Igenamiterere',
    work: 'Akazi', // TODO: unsure
    insight: 'Isesengura', // TODO: unsure
    share: 'Gusangira', // TODO: unsure
    find: 'Gushaka ibimera', // TODO: unsure
  },
  userMenu: {
    suffix: 'ibijyanye na konti', // TODO: unsure
    profile: "Umwirondoro n'igenamiterere", // TODO: unsure
  },
  shell: {
    search: 'Shakisha',
    searchPlaceholder: 'Jya ku ipaji cyangwa igikorwa…', // TODO: unsure
    searchEmpty: 'Nta cyabonetse.', // TODO: unsure
    actions: 'Ibikorwa byihuse', // TODO: unsure
    more: 'Ibindi',
    hideMenu: 'Hisha urutonde', // TODO: unsure
    showMenu: 'Erekana urutonde', // TODO: unsure
    install: 'Shyiraho porogaramu', // TODO: unsure
    installIos: 'Kuri iPhone cyangwa iPad: kanda "Share", hanyuma "Add to Home Screen".', // TODO: unsure
  },
  table: {
    count: '{n} byanditswe', // TODO: unsure
    countOne: '1 cyanditswe', // TODO: unsure
    search: 'Shakisha',
    searchNameEmail: 'Shakisha izina cyangwa imeri',
    searchPlants: "Shakisha ukoresheje izina ry'igihingwa", // TODO: unsure
    searchBoard: "Shakisha igihingwa cyangwa pepiniyeri", // TODO: unsure
    filter: 'Muyunguruzi', // TODO: unsure
    view: 'Uko bigaragara', // TODO: unsure
    table: 'Imbonerahamwe',
    cards: 'Amakarita', // TODO: unsure
    actions: 'Ibikorwa',
    open: 'Fungura',
    status: 'Imimerere', // TODO: unsure
    byStatus: 'Ukurikije imimerere', // TODO: unsure
    byType: 'Ukurikije ubwoko',
    byStage: "Ukurikije icyiciro cy'ikura", // TODO: unsure
    byRisk: "Ukurikije urwego rw'ibyago", // TODO: unsure
    byDistrict: 'Ukurikije akarere',
    byPlantType: "Ukurikije ubwoko bw'igihingwa",
    byEntity: "Ukurikije ubwoko bw'inyandiko", // TODO: unsure
    allStatuses: 'Imimerere yose', // TODO: unsure
    allTypes: 'Ubwoko bwose',
    allDistricts: 'Uturere twose',
    allPlantTypes: "Ubwoko bwose bw'ibihingwa",
    allLevels: "Inzego zose z'ibyago", // TODO: unsure
    allEntities: "Ubwoko bwose bw'inyandiko", // TODO: unsure
    name: 'Izina',
    email: 'Imeri',
    type: 'Ubwoko',
    district: 'Akarere',
    registered: 'Yiyandikishije', // TODO: unsure
    noMatch: "Nta kintu gihuye n'ibyo ushaka.", // TODO: unsure
    closeDetails: 'Funga ibisobanuro', // TODO: unsure
  },
  theme: {
    title: 'Imigaragarire', // TODO: unsure
    hint: 'Hitamo amabara y\'umucyo cyangwa y\'umwijima. "Nk\'igikoresho" ikurikiza igenamiterere rya telefoni cyangwa mudasobwa yawe. Bibikwa kuri iki gikoresho.', // TODO: unsure
    light: 'Umucyo',
    dark: 'Umwijima',
    system: "Nk'igikoresho", // TODO: unsure
  },
  sync: {
    title: 'Guhuza amakuru', // TODO: unsure ("Sync")
    intro: "Ibyo wanditse kuri iyi telefoni bibikwa hano mbere, bikoherezwa kuri seriveri igihe hari interineti.",
    syncing: 'Birahuzwa…',
    waiting: '{n} bitegereje koherezwa',
    waitingOne: 'Bitegereje koherezwa',
    problems: '{n} bikeneye kurebwa',
    syncNow: 'Ohereza nonaha',
    allSynced: 'Byose byoherejwe.',
    offlineNow: 'Nta interineti ufite. Impinduka zizoherezwa ubwazo interineti igarutse.',
    offlineCopy: 'Nta interineti ufite. Ibi ni ibyo telefoni yabitse ubushize.',
    needsInternet: 'Iki gice gikenera interineti.',
    savedOffline: 'Byabitswe kuri iyi telefoni. Bizoherezwa ubwabyo uri kuri interineti.',
    notYetSynced: 'ntibiroherezwa',
    refused: 'Seriveri yabyanze',
    discard: 'Kuraho',
    serverWins: "Iyo seriveri yanze impinduka (urugero ingemwe zagurishijwe ku yindi telefoni), hagumaho ibyanditse kuri seriveri. Reba imibare wongere wandike niba bikenewe.",
    lastResult: 'Ubushize {time}: {applied} byoherejwe, {skipped} byari bihari, {conflicts} byanzwe.',
    signOutWarning: '{n} byanditse kuri iyi telefoni ntibiroherezwa kandi bizatakara usohotse. Usohoka uko byagenda kose?',
    describe: {
      sale: 'Igurisha ry\'ingemwe {n}',
      expense: 'Ikoreshwa {amount} ({category})',
      batch: 'Icyiciro gishya cy\'ingemwe {n}',
      stock_adjustment: 'Impinduka mu bubiko {n}: {reason}',
    },
    toastSent: 'Impinduka {n} zabitswe zoherejwe.',  // TODO: unsure
  },
  landing: {
    plantsTitle: 'Ingemwe ziboneka ubu', // TODO: Kinyarwanda to review
    plantsIntro: 'Ingemwe ziteguye za pepiniyeri zo muri Kigali. Ibigo byinjira bikohereza ubusabe; pepiniyeri irabwemeza.', // TODO: Kinyarwanda to review
    plantsAvailable: 'Ziboneka', // TODO: Kinyarwanda to review
    plantsPrice: "Igiciro cy'ingemwe", // TODO: Kinyarwanda to review
    plantsPrimeEnd: 'Igihe cyiza cyo gutera kirangira {date}', // TODO: Kinyarwanda to review
    plantsPrimeProgress: "{n}% by'igihe cyiza cyo gutera byarangiye", // TODO: Kinyarwanda to review
    plantsSignIn: 'Injira kugira ngo usabe', // TODO: Kinyarwanda to review
    plantsRequest: 'Saba', // TODO: Kinyarwanda to review
    plantsEmpty: 'Nta ngemwe zigaragara ubu. Garuka vuba.', // TODO: Kinyarwanda to review
    title1: 'Ibimera bike bipfa ubusa.',
    title2: 'Kigali itoshye kurushaho.',
    intro:
      "Smart Green Hub ifasha pepiniyeri z'indabo n'ibiti kumenya hakiri kare ingemwe zishobora kutagurishwa, guha ibimera birenze amashuri, amatorero, amahoteli, ibiro by'imirenge n'amatsinda y'abaturage, no gutegura ibyo gutera ubutaha.", // TODO: unsure
    ctaNursery: 'Andikisha pepiniyeri yawe',
    ctaInstitution: 'Andikisha ikigo',
    free: "Ni ubuntu kuri pepiniyeri n'ibigo. Si iduka ryo kuri interineti.",
    pillarsTitle: 'Icyo uru rubuga rukora',
    pillarPredict: 'Guteganya',
    pillarPredictText: 'Amategeko yoroshye agusobanurira hakiri kare igihe icyiciro gishobora kutagurishwa.', // TODO: unsure
    pillarRedirect: 'Kohereza',
    pillarRedirectText: 'Ibimera bikuze birenze bihabwa ibigo bibikeneye mu gutoshya.',
    pillarPlan: 'Gutegura',
    pillarPlanText: "Amateka yawe y'igurisha akugira inama y'ingano yo gutera ubutaha.",
    pillarMeasure: 'Gupima',
    pillarMeasureText: "Reba ibirenze byoherejwe, ingemwe zatanzwe zo gutoshya n'ubuso bwabohowe.", // TODO: Kinyarwanda to review
    impactTitle: 'Umusaruro wo gutoshya kugeza ubu',
    impactEmpty: 'Nta ihererekanya riranditswe. Iyi mibare iva gusa ku ihererekanya ryemejwe.',
    directoryTitle: 'Urutonde rwa pepiniyeri',
    directoryIntro: "Pepiniyeri zemejwe muri Kigali zemeye kugaragara. Muvugane nazo.",
    directoryEmpty: 'Nta pepiniyeri iragaragazwa.',
    badge: "Ni ubuntu ku bapepiniyeri n'ibigo · Si iduka rya interineti",  // TODO: unsure
    ctaNeed: 'Dukeneye ibimera',  // TODO: unsure
    heroCaption: 'Ibimera birenze muri pepiniyeri, Kigali itoshye kurushaho.',  // TODO: unsure
    heroLink: 'Shaka pepiniyeri ziri hafi yawe',  // TODO: unsure
    navHow: 'Uko bikora',
    navDirectory: 'Urutonde',  // TODO: unsure
    navImpact: 'Umusaruro',  // TODO: unsure
    problemLabel: 'Impamvu ya Smart Green Hub',  // TODO: unsure
    problemText: "Ibimera bizima byo muri pepiniyeri za Kigali akenshi bikura birenze igihe cyiza bikajugunywa, mu gihe amashuri n'imiryango bishaka ibimera byo gutera.",  // TODO: unsure
    forNurseries: 'Pepiniyeri',
    forNurseriesText: "Imiburo hakiri kare, gahunda yo gutera n'ahantu h'ubuntu ho gutanga ibimera birenze, ndetse nta interineti.",  // TODO: unsure
    forInstitutions: 'Ibigo',
    forInstitutionsText: "Shaka ibimera bikuze hafi yawe, ubisabe ugaragaza icyo bizakora, hanyuma wemeze ko wabyakiriye.",  // TODO: unsure
    forCity: 'Kigali',
    forCityText: "Buri ihererekanya ryemejwe rirabarwa: ibirenze byoherejwe, ingemwe zatanzwe zo gutoshya, ubutaka bwakuweho n'ahatewe.", // TODO: Kinyarwanda to review
    receiversTitle: 'Ibimera bijya ku',  // TODO: unsure
    howTitle: 'Uko bikora',
    step1: 'Iyandikishe wemezwe',  // TODO: unsure
    step1Text: "Pepiniyeri n'ibigo biriyandikisha; umuyobozi agenzura buri konti.",  // TODO: unsure
    step2: 'Andika uburirwe hakiri kare',  // TODO: unsure
    step2Text: "Pepiniyeri zandika ibyiciro n'ibyagurishijwe, ndetse nta interineti. Ibyiciro biri mu kaga bimenyeshwa hakiri kare.",  // TODO: unsure
    step3: 'Tanga kandi usabe',  // TODO: unsure
    step3Text: 'Ibimera birenze bishyirwa ku Kibaho; ibigo byemejwe birabisaba.',  // TODO: unsure
    step4: 'Hererekanya upime umusaruro',  // TODO: unsure
    step4Text: 'Impande zombi zemeza ihererekanya, hanyuma umusaruro ukabarwa.',  // TODO: unsure
    ctaTitle: 'Ifatanye natwe gutoshya Kigali',  // TODO: unsure
    ctaText: "Ni ubuntu ku bapepiniyeri n'ibigo bya Gasabo, Kicukiro na Nyarugenge.",  // TODO: unsure
    footerPlatform: 'Urubuga',  // TODO: unsure
    footerAccount: 'Konti',
    footerDistricts: 'Uturere',
    footerCredits: "Abafotoye amafoto",  // TODO: unsure
    footerCreditsText: 'Amafoto yo kuri Wikimedia Commons, akoreshwa hakurikijwe uburenganzira bwayo bwa rusange:',  // TODO: unsure
    directoryCount: 'Pepiniyeri {n} ziri ku rutonde',  // TODO: unsure
    photoAlt: {
      hero: "Umurima w'icyayi ku misozi y'Iburengerazuba bw'u Rwanda",  // TODO: unsure
      hills: "Imisozi itoshye n'amazu bya Nyamagabe, u Rwanda",  // TODO: unsure
      sunset: "Imisozi ya Kigali izuba rirenga",  // TODO: unsure
      planting: "Umusore utera ingemwe y'igiti hafi y'ikiyaga mu Rwanda",  // TODO: unsure
      labelled: "Imirongo y'ingemwe z'ibiti muri pepiniyeri ifite icyapa",  // TODO: unsure
      bags: "Ingemwe nto z'ibiti mu masashe",  // TODO: unsure
    },
  },
  auth: {
    loginTitle: 'Injira',
    loginIntro: 'Murakaza neza. Injira ucunge pepiniyeri yawe cyangwa ubusabe bwawe.',
    email: 'Imeri',
    password: "Ijambo ry'ibanga",
    passwordHint: "Nibura inyuguti 8, harimo inyuguti n'umubare.",
    forgot: "Wibagiwe ijambo ry'ibanga?",
    noAccount: 'Nta konti ufite?',
    haveAccount: 'Usanzwe wariyandikishije?',
    notVerified: "Banza wemeze imeri yawe ukoresheje kode y'imibare 6 twakoherereje.",
    registerTitle: 'Fungura konti',
    registerIntro: "Kwiyandikisha ni ubuntu. Umuyobozi agenzura buri pepiniyeri n'ikigo mbere y'uko gishyira ahagaragara cyangwa gisaba ibimera.",
    iAm: 'Ndiyandikisha nka',
    roleOperator: 'Pepiniyeri',
    roleOperatorHint: 'Ntera indabo cyangwa ibiti byo kugurisha',
    roleInstitution: 'Ikigo',
    roleInstitutionHint: 'Dukeneye ibimera byo gutoshya',
    fullName: 'Amazina yawe yose',
    phone: 'Nimero ya telefoni',
    yourDetails: 'Amakuru yawe',
    nurseryDetails: 'Amakuru ya pepiniyeri',
    institutionDetails: "Amakuru y'ikigo",
    nurseryName: 'Izina rya pepiniyeri',
    orgName: "Izina ry'ikigo",
    orgType: "Ubwoko bw'ikigo",
    district: 'Akarere',
    sector: 'Umurenge',
    address: 'Aderesi cyangwa ikimenyetso',
    contactPhone: "Telefoni y'ikigo",
    listConsent: 'Garagaza pepiniyeri yanjye (izina, aho iherereye na telefoni) ku rutonde rusange nyuma yo kwemezwa',
    choose: 'Hitamo…',
    createAccount: 'Fungura konti',
    forgotTitle: "Wibagiwe ijambo ry'ibanga?",
    resetTitle: "Hitamo ijambo ry'ibanga rishya",
    newPassword: "Ijambo ry'ibanga rishya",
    confirmPassword: "Subiramo ijambo ry'ibanga rishya",
    setPassword: "Bika ijambo ry'ibanga rishya",
    resetDone: "Ijambo ry'ibanga ryahinduwe kandi wasohowe ku bikoresho byose. Injira ukoresheje ijambo ry'ibanga rishya.",
    passwordsDiffer: "Amagambo y'ibanga yombi ntabwo ari kimwe.",
  },
  account: {
    welcome: 'Murakaza neza, {name}',
    statusTitle: 'Igenzura rya konti',
    pendingText: 'Umuyobozi arimo kugenzura amakuru yawe. Ibindi byose bizafunguka nyuma yo kwemezwa.',
    approvedText: 'Konti yawe yemejwe. Serivisi zose zirafunguye.',
    rejectedText: 'Umuyobozi yagusabye gukosora amakuru yawe:',
    editDetails: 'Hindura amakuru',
    resubmit: 'Bika kandi wongere wohereze kugira ngo bigenzurwe',
    detailsSaved: 'Amakuru yawe yabitswe.',
    documentsTitle: 'Inyandiko zishyigikira',
    documentsHint: 'Si ngombwa: uruhushya, icyemezo cyo kwandikwa cyangwa ibaruwa ifasha umuyobozi kugenzura amakuru yawe. PDF, PNG cyangwa JPEG, kugeza kuri MB 10.',
    upload: 'Ohereza inyandiko',
    uploading: 'Birimo koherezwa…',
    uploaded: 'Inyandiko yoherejwe.',
    noDocuments: 'Nta nyandiko irahari.',
    nextSteps: 'Ibikurikiraho',
    nextOperator: "Nyuma yo kwemezwa uzajya wandika ibyiciro, ibyagurishijwe n'ibyakoreshejwe (n'igihe nta interineti), ubone imiburo hakiri kare kandi ushyire ibimera ku rubuga rw'ibirenze.",
    nextInstitution: "Nyuma yo kwemezwa uzajya ureba ibimera birenze kandi usabe ibimera by'imishinga yawe yo gutoshya.",
  },
  settings: {
    title: 'Igenamiterere',
    profile: 'Umwirondoro wawe',
    languageHint: "Porogaramu n'imeri zawe bikoresha uru rurimi.",
    saved: 'Igenamiterere ryabitswe.',
    location: "Aho iherereye ku ikarita",
    locationHint: 'Kanda ku ikarita aho pepiniyeri yawe iri. Ibigo n\'abashyitsi babikoresha bakubona.',
    removePin: 'Kuraho ikimenyetso',
  },
  dashboard: {
    plantsInStock: 'Ingemwe zihari',
    inBatches: 'mu byiciro {n} bikora',
    openAlerts: 'Imiburo ifunguye',
    alertsHint: '{high} hejuru, {medium} hagati',
    activeListings: 'Amatangazo y\'ibirenze akora',
    pendingRequests: 'Ubusabe {n} bugutegereje',
    monthNet: "Inyungu y'uku kwezi",
    monthHint: 'Ibyinjiye {income} · Ibyakoreshejwe {expenses}',
    attention: 'Bikeneye kwitabwaho',
    attentionEmpty: 'Nta cyiciro gikeneye kwitabwaho ubu.',
    viewAll: 'Reba byose',
    quickActions: 'Ibikorwa byihuse',
    addBatch: 'Ongeraho icyiciro',
    recordSale: 'Andika igurisha',
    recordExpense: 'Andika ikoreshwa',
    postSurplus: 'Shyira ibirenze',
    offlineNote: "Ibyiciro, ibyagurishijwe n'ibyakoreshejwe bishobora kwandikwa nta interineti. Byoherezwa ugarutse kuri interineti.",
    greetMorning: 'Mwaramutse, {name}',
    greetAfternoon: 'Mwiriwe, {name}',
    greetEvening: 'Muraho, {name}',  // TODO: unsure
    salesMonth: "Ibyagurishijwe uku kwezi",  // TODO: unsure
    vsLastMonth: "{p} ugereranyije n'ukwezi gushize",  // TODO: unsure
    actNow: 'Kora nonaha',  // TODO: unsure
    requestsWaiting: 'Ubusabe bugutegereje',  // TODO: unsure
    riskOverview: 'Ibyiciro ukurikije ibyago',  // TODO: unsure
    batchesLabel: 'ibyiciro',  // TODO: unsure
    lowOrNone: 'Bike (nta muburo)',  // TODO: unsure
    timeline: 'Igihe cyiza cyo kugurisha',  // TODO: unsure
    incomeExpenses: "Amafaranga yinjiye n'ayasohotse (amezi 6)",  // TODO: unsure
    primeEnds: 'Igihe cyiza kirangira {date}',  // TODO: unsure
    primeOver: 'igihe cyiza cyarangiye',  // TODO: unsure
    primeToday: 'kirangira uyu munsi', // TODO: unsure
    legendGrowing: 'Birakura',  // TODO: unsure
    legendPrime: 'Igihe cyiza (cyo kugurisha)',  // TODO: unsure
    legendToday: 'Uyu munsi',
  },
  batches: {
    title: "Ibyiciro by'ingemwe",
    intro: "Icyiciro ni itsinda ry'ingemwe z'ubwoko bumwe zatewe umunsi umwe.",
    add: 'Ongeraho icyiciro',
    newTitle: 'Ongeraho icyiciro',
    newIntro: "Itariki yo kwitegura n'iherezo ry'igihe cyiza cyo kugurisha bibarwa hakurikijwe amategeko y'ubwoko yashyizweho n'umuyobozi.", // TODO: Kinyarwanda to review
    species: 'Ubwoko',
    quantity: "Umubare w'ingemwe",
    plantingDate: 'Itariki yo gutera',
    unitPrice: "Igiciro cy'ingemwe imwe (RWF)",
    rulesHint: "Byashyizweho n'umuyobozi: yitegura nyuma y'iminsi {days}, igurishwa neza mu minsi {prime}.", // TODO: Kinyarwanda to review
    pendingHint: "Ubu bwoko butegereje kwemezwa. Amatariki azongerwaho umuyobozi nabwemeza.", // TODO: Kinyarwanda to review
    notListed: "Ubwoko bwanjye ntiburi ku rutonde", // TODO: Kinyarwanda to review
    newSpeciesName: "Izina ry'ubwoko", // TODO: Kinyarwanda to review
    newSpeciesLocal: "Izina ry'ikinyarwanda cyangwa iryo mu karere", // TODO: Kinyarwanda to review
    newSpeciesHint: "Umuyobozi agenzura ubwoko akongeraho igihe cyo gukura. Kugeza icyo gihe icyiciro kirabikwa kigategereza kwemezwa k'ubwoko.", // TODO: Kinyarwanda to review
    noSpeciesYet: 'Nta bwoko buremezwa. Hitamo "Ubwoko bwanjye ntiburi ku rutonde" wohereze ubwawe ku muyobozi.', // TODO: Kinyarwanda to review
    didYouMean: "Ese wavugaga kimwe muri ibi?", // TODO: Kinyarwanda to review
    alreadyListed: "Ubu bwoko busanzwe ku rutonde:", // TODO: Kinyarwanda to review
    useThis: "Koresha ubu bwoko", // TODO: Kinyarwanda to review
    addAsNew: 'Oya, ongeraho "{name}" nk\'ubwoko bushya', // TODO: Kinyarwanda to review
    createdWaiting: "Icyiciro cyabitswe. Gitegereje kwemezwa k'ubwoko.", // TODO: Kinyarwanda to review
    waitingSpecies: "Gitegereje kwemezwa k'ubwoko", // TODO: Kinyarwanda to review
    speciesRejected: "Ubwoko bwanzwe: hitamo ubundi bwoko", // TODO: Kinyarwanda to review
    waitingSpeciesText: 'Gitegereje kwemezwa k\'ubwoko: "{name}". Itariki yo kwitegura, imiburo, inama zo gutera n\'urubuga rw\'ibirenze bizatangira umuyobozi nabwemeza. Ingemwe zimaze kubarirwa mu bubiko bwawe.', // TODO: Kinyarwanda to review
    rejectedText: 'Umuyobozi ntiyemeje "{name}". Ingemwe zawe ziracyari mu bubiko: hitamo ubundi bwoko kuri iki cyiciro.', // TODO: Kinyarwanda to review
    chooseSpecies: "Ubundi bwoko", // TODO: Kinyarwanda to review
    useSpecies: "Koresha ubu bwoko", // TODO: Kinyarwanda to review
    speciesChanged: "Ubwoko bwahinduwe.", // TODO: Kinyarwanda to review
    noOtherSpecies: "Nta bundi bwoko buhari bwo guhitamo. Saba umuyobozi kubwongeraho.", // TODO: Kinyarwanda to review
    afterApproval: "Nyuma yo kwemeza ubwoko", // TODO: Kinyarwanda to review
    save: 'Bika icyiciro',
    created: 'Icyiciro cyabitswe.',
    saved: 'Impinduka zabitswe.',
    adjusted: 'Ububiko bwahinduwe.',
    archived: 'Icyiciro cyabitswe mu bubiko bw\'amateka.', // TODO: unsure ("archived")
    stage: 'Icyiciro cyo gukura', // TODO: unsure ("stage")
    readyDate: 'Itariki iteganyijwe yo kwitegura',
    primeEnd: 'Igihe cyiza kirangira',
    inStock: 'Zihari',
    availableLabel: 'Zishobora kugurishwa',
    available: '{n} zishobora kugurishwa',
    planted: 'yatewe {date}',
    suggested: 'Amatariki agaragaza: {stage}',
    allActive: 'Byose bikora',
    empty: 'Nta byiciro biraba hano',
    emptyText: "Ongeraho icyiciro cya mbere utangire gukurikirana ububiko, igurisha n'ibyago by'ibirenze.",
    edit: "Icyiciro n'igiciro", // TODO: Kinyarwanda to review
    adjustTitle: 'Hindura ububiko',
    change: 'Impinduka',
    changeHint: 'Koresha ikimenyetso cya minus ukuramo ingemwe (urugero -20 zapfuye kubera indwara) cyangwa umubare wongera.',
    reason: 'Impamvu',
    reasonExample: 'Zapfuye kubera indwara',
    adjust: 'Bika impinduka',
    adjustments: "Amateka y'ububiko",
    noAdjustments: 'Nta mpinduka iraba.',
    sales: "Ibyagurishijwe muri iki cyiciro",
    archive: 'Bika mu mateka', // TODO: unsure
    archiveConfirm: 'Kuki ubika iki cyiciro mu mateka? (Kiguma mu nyandiko, ntigisibwa.)',
    promisedHint: "Ingemwe {n} zasezeranyijwe ku rubuga rw'ibirenze ntizishobora kugurishwa.",
    primeProgress: 'Aho bigeze ugana ku iherezo ry\'igihe cyiza',  // TODO: unsure
  },
  sales: {
    title: "Ibyagurishijwe n'ibyakoreshejwe",
    intro: 'Andika ibyo ugurisha n\'ibyo ukoresha. Bikora nta interineti.',
    tabs: { sale: 'Andika igurisha', expense: 'Andika ikoreshwa', history: 'Amateka', profit: 'Inyungu cyangwa igihombo' },
    batch: 'Icyiciro',
    quantity: "Umubare w'ingemwe zagurishijwe",
    price: "Igiciro cy'ingemwe imwe (RWF)",
    total: 'Igiteranyo: {total}',
    totalLabel: 'Igiteranyo',
    note: 'Icyitonderwa',
    saveSale: 'Bika igurisha',
    saleSaved: 'Igurisha ryabitswe.',
    category: 'Icyiciro',
    amount: 'Amafaranga (RWF)',
    date: 'Itariki',
    saveExpense: 'Bika ikoreshwa',
    expenseSaved: 'Ikoreshwa ryabitswe.',
    salesList: 'Ibyagurishijwe',
    expensesList: 'Ibyakoreshejwe',
    noSales: 'Nta gurisha riranditswe.',
    noExpenses: 'Nta koreshwa riranditswe.',
    undo: 'Kuraho',
    undoConfirm: 'Kuki ukuraho iyi nyandiko? (Ibikwa mu mateka, ntisibwa.)',
    undone: 'Inyandiko yakuweho.',
    period: 'Igihe',
    periods: { month: 'Uku kwezi', '3months': 'Amezi 3 ashize', year: 'Uyu mwaka', all: 'Ibihe byose' },
    income: 'Ibyinjiye',
    expensesLabel: 'Ibyakoreshejwe',
    profit: 'Inyungu',
    loss: 'Igihombo',
    unitsSold: 'Ingemwe {n} zagurishijwe',
    monthly: 'Ukwezi ku kwezi',
    monthlyIncome: 'Ibyinjiye buri kwezi (RWF)',
    bySpecies: 'Ibyinjiye hakurikijwe ubwoko',
    byBatch: 'Ibyinjiye hakurikijwe icyiciro',
    byCategory: 'Ibyakoreshejwe hakurikijwe icyiciro',
    profitNote: 'Ibyakoreshejwe byandikwa kuri pepiniyeri yose, bityo inyungu igaragazwa kuri pepiniyeri yose.',
  },
  alerts: {
    title: "Imiburo y'ibirenze",
    intro: 'Buri joro sisitemu igenzura buri cyiciro: kizagurishwa mbere y\'uko igihe cyiza kirangira? Wowe ufata icyemezo.',
    checkNow: 'Genzura nonaha',
    checked: 'Ibyiciro {n} byagenzuwe, imiburo mishya {created}.',
    empty: 'Nta muburo uhari',
    emptyText: "Ibyiciro bifite ibyago by'ibirenze biri Hagati cyangwa Hejuru bigaragara hano.",
    generated: 'Byagenzuwe {date}',
    projected: 'Zishobora kutagurishwa',
    daysLeftLabel: "Iminsi isigaye y'igihe cyiza",
    daysLeft: 'Hasigaye iminsi {n}',
    salesRate: "Umuvuduko w'igurisha",
    perDay: '{n} ku munsi',
    riskRatio: 'Igipimo cy\'ibyago',
    suggested: 'Icyo ugirwa inama',
    youDecide: 'Ni inama gusa. Nta kintu gihindurwa ubwacyo.',
    why: 'Kuki uru rwego?',
    explain: {
      stock: 'Ingemwe zihari (S): {s}',
      // TODO: native-speaker review (rate and sellingDays updated after the supervisor review)
      rate: "Umuvuduko w'igurisha (r): {r} ku munsi, umugabane w'iki cyiciro ku byo wagurishije by'ubu bwoko mu byumweru bishize (bigabanywa n'ibindi byiciro byawe byeze by'ubu bwoko, bikurikije umubare)",
      days: "Iminsi isigaye y'igihe cyiza (D): {d}",
      sellingDays: "Iminsi zishobora kugurishwamo (iki cyiciro ntikireze, ni yo mpamvu habarwa iminsi uhereye igihe kizera gusa): {ds}",
      unsold: 'Zishobora kutagurishwa (U) = S - r × iminsi zishobora kugurishwamo = {s} - {r} × {d} = {u} (ntijya munsi ya 0)',
      ratio: "Igipimo cy'ibyago (R) = U ÷ S = {u} ÷ {s} = {p}%",
      levels: 'Hejuru: 50% cyangwa birenga, cyangwa igihe cyiza cyarangiye. Hagati: 20% kugeza 49%. Hasi: munsi ya 20%.',
    },
    note: 'Icyitonderwa',
    acknowledge: 'Nabibonye',
    resolve: 'Byakemutse',
    dismiss: 'Birengagize',
    changed: { acknowledged: 'Umuburo wabonywe.', resolved: 'Umuburo wakemutse.', dismissed: 'Umuburo wirengagijwe.' },
  },
  planting: {
    title: 'Gahunda yo gutera',
    intro: "Umubare w'ingemwe wo gutera ubutaha, hakurikijwe ibyo wagurishije mu mezi 3 ashize, igihe cyo gukura n'ibimaze guterwa.",
    empty: 'Nta nama iraboneka',
    emptyText: 'Inama zigaragara ku moko utera cyangwa ugurisha.',
    plantAbout: 'Tera nka {n}',
    basisTitle: 'Uko uyu mubare wabazwe',
    basis: {
      sold: 'Byagurishijwe mu mezi 3 ashize: {n} (nka {avg} buri kwezi)',
      cycle: 'Igihe cyo gukura: iminsi {days} = amezi {months}',
      margin: "Inyongera y'umutekano: {p}%",
      pipeline: 'Zimaze kuba mu byiciro bikura cyangwa byiteguye: {n}',
      formula: '{avg} × {months} × {m} − {pipeline} = {n} (ntijya munsi ya 0)',
    },
    notEnough: "Nta mateka ahagije y'igurisha",
    notEnoughText: "Inama ikenera nibura amezi 3 y'igurisha ry'ubu bwoko, harimo igurisha ryo mu mezi 3 ashize.",
    firstSale: 'Igurisha rya mbere: {date}',
    accept: 'Emera',
    dismiss: 'Birengagize',
    accepted: 'Inama yemewe kandi irabitswe.',
    dismissed: 'Inama yirengagijwe.',
    status: { accepted: 'Yemewe', dismissed: 'Yirengagijwe', suggested: 'Yatanzwe' },
  },
  listings: {
    title: "Amatangazo yanjye y'ibirenze",
    intro: "Tanga ingemwe zikuze ku mashuri, amatorero, amahoteli, ibiro by'imirenge n'amatsinda y'abaturage, ku buntu cyangwa ku giciro cyagabanyijwe.",
    new: "Shyira ingemwe ku rubuga",
    noBatches: 'Nta cyiciro gifite ingemwe zishobora gutangwa ubu.',
    quantity: "Umubare w'ingemwe zitangwa",
    offerType: 'Uburyo',
    free: 'Ku buntu',
    discounted: 'Igiciro cyagabanyijwe',
    price: "Igiciro cyagabanyijwe cy'ingemwe imwe (RWF)",
    priceHint: 'Kwishyura kumvikanwaho hagati yawe n\'ikigo. Urubuga ntirwakira amafaranga.',
    pickupNote: 'Aho zifatirwa',
    pickupExample: 'Irembo B, mu gitondo cy\'iminsi y\'akazi',
    availableFrom: 'Biboneka guhera',
    expiresAt: 'Birangira',
    publish: 'Tangaza',
    created: "Itangazo ryashyizwe ku rubuga rw'ibirenze.",
    withdraw: 'Kuraho',
    withdrawReason: 'Kuki ukuraho iri tangazo? Ubusabe bwari butegereje buzahagarikwa.',
    withdrawn: 'Itangazo ryakuweho.',
    empty: 'Nta tangazo riraba',
    emptyText: 'Shyira ingemwe zo mu cyiciro kitazagurishwa ku gihe.',
    fromBatch: 'Icyiciro #{id}',
    offered: 'Zatanzwe',
    reservedLabel: 'Zafashwe',
    handedOver: 'Zahererekanyijwe',
    remaining: 'Zikiboneka',
    dates: '{from} kugeza {to}',
  },
  requests: {
    title: 'Ubusabe',
    introOperator: 'Ibigo bisaba ingemwe zawe zirenze cyangwa ziboneka. Emeza cyangwa wange, hanyuma wemeze ihererekanya.', // TODO: Kinyarwanda to review
    source: { surplus_offer: 'Ibirenze bitangwa', available_plant: 'Ingemwe ziboneka' }, // TODO: Kinyarwanda to review
    introInstitution: 'Ubusabe bwawe. Pepiniyeri imaze kwemeza, fata ingemwe hanyuma wemeze ko wazakiriye.',
    empty: 'Nta busabe buhari.',
    purpose: 'Icyo zizakoreshwa',
    from: 'Ikigo',
    contact: 'Uwo kuvugana na we',
    where: 'Aho pepiniyeri iri',
    reason: 'Impamvu (ibwirwa ikigo)',
    reasonGiven: 'Impamvu: {reason}',
    approve: 'Emeza',
    decline: 'Wange',
    approved: 'Ubusabe bwemejwe. Nimero zo kuvugana zasangijwe.',
    declined: 'Ubusabe bwanzwe. Ingemwe zongeye kuboneka.',
    cancel: 'Hagarika ubusabe',
    cancelConfirm: 'Uhagarika ubu busabe? Ingemwe zizahabwa abandi.',
    cancelled: 'Ubusabe bwahagaritswe.',
    nurseryConfirmed: 'Pepiniyeri yemeje',
    institutionConfirmed: 'Ikigo cyemeje',
    confirmHandoverTitle: 'Umaze gutanga ingemwe, emeza hano.',
    confirmReceiptTitle: 'Umaze kwakira ingemwe, emeza hano.',
    landCleared: 'Ubutaka bwabohowe (m²)',
    landClearedHint: 'Ubuso bwa pepiniyeri bubohowe bwo gutera ubutaha.',
    plantingSite: 'Aho zizaterwa',
    plantingSiteExample: "Ubusitani bw'ishuri, Remera",
    confirmHandover: 'Emeza ihererekanya',
    confirmReceipt: 'Emeza ko wakiriye',
    confirmedWaiting: 'Byemejwe. Dutegereje ko undi nawe yemeza.',
    completed: "Ihererekanya ryarangiye. Ububiko n'umusaruro byahinduwe.",
    waitingOther: 'Wemeje. Dutegereje undi.',
    fulfilledOn: 'Byahererekanyijwe {date} · {site}',
    closedOn: { declined: 'Byanzwe {date}', cancelled: 'Byahagaritswe {date}' }, // TODO: Kinyarwanda to review
  },
  board: {
    title: 'Ibimera birenze',
    intro: 'Ingemwe zikuze zitangwa na pepiniyeri zemejwe. Saba ibyo ukeneye; uzumvikana na pepiniyeri uko uzazifata.',
    plantType: "Ubwoko bw'igihingwa",
    view: 'Uko bigaragara',
    list: 'Urutonde',
    map: 'Ikarita',
    empty: 'Nta ngemwe zitangwa ubu',
    emptyText: "Gerageza akandi karere cyangwa ubundi bwoko, cyangwa ugaruke nyuma.",
    left: '{n} ziraboneka',
    priceEach: '{price} ku ngemwe',
    until: 'Kugeza {date}',
    request: 'Saba ingemwe',
    quantity: 'Ingemwe zingahe?',
    purpose: 'Icyo zizakoreshwa',
    purposeExample: "Ibiti ku ruzitiro rw'ishuri",
    send: 'Ohereza ubusabe',
    sent: 'Ubusabe bwoherejwe. Pepiniyeri izabwemeza cyangwa ibwange.',
    already: 'Usanzwe ufite ubusabe butegereje kuri izi ngemwe.', // TODO: Kinyarwanda to review
    noLocation: "Ibintu {n} ni ibya pepiniyeri zitagaragaza aho ziri ku ikarita; bigaragara ku rutonde gusa.", // TODO: Kinyarwanda to review
    offers: 'Ibirenze bitangwa', // TODO: Kinyarwanda to review
    available: 'Ingemwe ziboneka', // TODO: Kinyarwanda to review
    offersIntro: "Ingemwe pepiniyeri itanga ku buntu cyangwa ku giciro gito kuko zitazagurishwa ku gihe.", // TODO: Kinyarwanda to review
    availableIntro: "Ingemwe ziteguye pepiniyeri zishobora gutanga. Ohereza ubusabe; pepiniyeri irabwemeza cyangwa ikabwanga.", // TODO: Kinyarwanda to review
    emptyAvailable: 'Nta ngemwe ziboneka ubu', // TODO: Kinyarwanda to review
    pickupDate: "Itariki wifuza kuzifata", // TODO: Kinyarwanda to review
    message: 'Ubutumwa kuri pepiniyeri', // TODO: Kinyarwanda to review
    pickupFrom: 'Zafatwa guhera {date}', // TODO: Kinyarwanda to review
    allSpecies: 'Amoko yose', // TODO: Kinyarwanda to review
    bySpecies: 'Ubwoko', // TODO: Kinyarwanda to review
    minQuantity: 'Byibura (ingemwe)', // TODO: Kinyarwanda to review
  },
  impact: {
    title: 'Umusaruro',
    intro: {
      operator: 'Ingemwe zo muri pepiniyeri yawe zageze aho guterwa.',
      institution: "Ingemwe ikigo cyawe cyakiriye kandi cyateye.",
      admin: 'Ihererekanya ryose ryemejwe ku rubuga.',
    },
    plants: 'Ibirenze byoherejwe', // TODO: Kinyarwanda to review
    plantsHint: "Ibirenze bitangwa n'ibyiciro bifite ibyago", // TODO: Kinyarwanda to review
    supplied: 'Zatanzwe zo gutoshya', // TODO: Kinyarwanda to review
    suppliedHint: 'Ziva mu bubiko busanzwe (ingemwe ziboneka)', // TODO: Kinyarwanda to review
    sitesHint: 'Ahantu {n} hatewe', // TODO: Kinyarwanda to review
    received: 'Ingemwe zakiriwe', // TODO: Kinyarwanda to review
    receivedHint: 'Ibirenze {surplus} byoherejwe, {supplied} zatanzwe zo gutoshya', // TODO: Kinyarwanda to review
    type: 'Ubwoko', // TODO: Kinyarwanda to review
    types: { surplus_redirected: 'Ibirenze byoherejwe', greening_supply: 'Zatanzwe zo gutoshya' }, // TODO: Kinyarwanda to review
    handovers: 'Ihererekanya ryarangiye',
    land: 'Ubutaka bwa pepiniyeri bwabohowe',
    sites: 'Aho zatewe',
    monthly: 'Ingemwe zahererekanyijwe buri kwezi', // TODO: Kinyarwanda to review
    byDistrict: 'Ingemwe hakurikijwe akarere',
    records: "Inyandiko z'ihererekanya",
    empty: 'Nta ihererekanya riraba',
    emptyText: "Imibare igaragara hano pepiniyeri n'ikigo bamaze kwemeza ihererekanya.",
    date: 'Itariki',
    quantity: 'Ingemwe',
    nursery: 'Pepiniyeri',
    institution: 'Ikigo',
    landShort: 'Ubutaka bwabohowe',
  },
  institutionHome: {
    pending: 'Ubusabe butegereje',
    approved: 'Bwemejwe, bwo gufata',
    approvedHint: 'Emeza ko wakiriye umaze gufata',
    findTitle: 'Shaka ingemwe z\'umushinga wawe utaha wo gutoshya',
    findText: 'Reba ingemwe z\'ubuntu n\'izigabanyirijwe igiciro za pepiniyeri zemejwe hafi yawe.',
    tracker: 'Ubusabe bwawe',
    noOpen: 'Nta busabe buri gukurikiranwa.',  // TODO: unsure
    browse: 'Reba Ikibaho cy\'ibimera birenze',  // TODO: unsure
    stepRequested: 'Byasabwe',  // TODO: unsure
    stepApproved: 'Byemejwe',
    stepHandedOver: 'Byatanzwe',  // TODO: unsure
    stepReceived: 'Byakiriwe',
    seeAll: 'Reba byose',
    nearYou: 'Biboneka muri {district}',  // TODO: unsure
    inProgress: 'Ubusabe buri gukurikiranwa',  // TODO: unsure
    inProgressHint: '{pending} bitegereje, {approved} byemejwe',  // TODO: unsure
  },
  notifications: {
    title: 'Amatangazo', // TODO: unsure ("Notifications")
    empty: 'Nta tangazo riraba.',
    markAll: 'Byose byasomwe',
    new: 'gishya',
    unreadLabel: 'Amatangazo, {n} ataresomwa',
    unreadCount: '{n} bitarasomwa', // TODO: unsure
    types: {
      alert_created: 'Ibyago {level}: {species} (icyiciro #{batch_id}). Inama: {action}.',
      request_created: '{institution} yasabye {quantity} {species}.',
      request_decided: '{nursery}: ubusabe bwawe bwa {quantity} {species}: {decision}.',
      request_cancelled: '{institution} yahagaritse ubusabe bwa {quantity} {species}.',
      handover_confirmed: 'Undi yemeje ihererekanya rya {quantity} {species}. Nawe wemeze.',
      handover_completed: 'Ihererekanya rya {quantity} {species} ryarangiye.',
      listing_expired: "Itangazo ryawe rya {species} ryarangiye.",
      verification_approved: '"{orgName}" yemejwe. Serivisi zose zirafunguye.',
      verification_rejected: '"{orgName}" ikeneye gukosorwa: {reason}',
      species_requested: '{nursery} yasabye kongeraho ubwoko "{species}".', // TODO: Kinyarwanda to review
      species_approved: 'Ubwoko "{species}" bwemejwe. Ibyiciro byawe ubu bifite amatariki n\'imiburo.', // TODO: Kinyarwanda to review
      species_rejected: 'Ubwoko "{species}" ntibwemejwe: {reason}. Hitamo ubundi bwoko ku byiciro byawe.', // TODO: Kinyarwanda to review
      species_merged: '"{species}" ni igihingwa kimwe na "{into}". Ibyiciro byawe ubu bikoresha "{into}".', // TODO: Kinyarwanda to review
      record_archived: "{name} byabitswe n'umuyobozi. Impamvu: {reason}", // TODO: Kinyarwanda to review
      record_restored: "{name} byagaruwe n'umuyobozi.", // TODO: Kinyarwanda to review
      support_ticket_created: "{from} yohereje ubusabe bw'ubufasha: {subject}", // TODO: Kinyarwanda to review
      support_user_replied: '{from} yasubije: {subject}', // TODO: Kinyarwanda to review
      support_reopened: "{from} yongeye gufungura ubusabe bw'ubufasha: {subject}", // TODO: Kinyarwanda to review
      support_admin_replied: "Umuyobozi yasubije ubusabe bwawe bw'ubufasha: {subject}", // TODO: Kinyarwanda to review
      support_resolved: "Ubusabe bwawe bw'ubufasha bwakemuwe: {subject}. Ushobora kubwongera gufungura mu minsi {days}.", // TODO: Kinyarwanda to review
    },
  },
  admin: {
    queueTitle: 'Ibitegereje kwemezwa',
    queueIntro: "Genzura pepiniyeri n'ibigo byiyandikishije mbere y'uko bishyira ahagaragara cyangwa bisaba ibimera.",
    pending: 'Bitegereje',
    approved: 'Byemejwe',
    rejected: 'Bikeneye gukosorwa',
    all: 'Byose',
    filterAll: 'Ubwoko bwose',
    filterNursery: 'Pepiniyeri',
    filterInstitution: 'Ibigo',
    nursery: 'Pepiniyeri',
    institution: 'Ikigo',
    empty: 'Nta kintu gitegereje.',
    registered: 'Yiyandikishije {date}',
    owner: 'Uhagarariye',
    documents: 'Inyandiko',
    noDocuments: 'Nta nyandiko yoherejwe.',
    open: 'Fungura',
    approve: 'Emeza',
    reject: 'Saba gukosora',
    reason: 'Impamvu (yoherezwa ku wasabye)',
    reasonRequired: 'Andika impamvu kugira ngo uwasabye amenye icyo agomba gukosora.',
    confirmReject: 'Ohereza ubusabe bwo gukosora',
    decided: 'Icyemezo cyabitswe kandi uwasabye yabimenyeshejwe.',
    select: 'Hitamo kimwe urebe ibisobanuro byacyo.',
    lastNote: 'Icyasabwe gukosorwa ubushize',
  },
  adminHome: {
    title: "Incamake y'umuyobozi",
    intro: 'Urubuga rwose mu ncamake.',
    runRisk: "Kora igenzura ry'ijoro nonaha",
    ran: 'Ibyiciro {n} byagenzuwe, imiburo mishya {created}, amatangazo {expired} yarangiye.',
    nurseries: 'Pepiniyeri',
    institutions: 'Ibigo',
    verifiedHint: '{approved} byemejwe, {pending} bitegereje',
    activeBatches: 'Ibyiciro bikora',
    activeListings: 'Amatangazo ari ku rubuga',
    openRequests: 'Ubusabe bufunguye',
    pendingVerification: 'Bitegereje kugenzurwa',
    failedEmails: 'Imeri zitagezeyo',
    todoTitle: 'Bikeneye ko ubyitaho',  // TODO: unsure
    todoVerify: 'konti zitegereje kwemezwa',  // TODO: unsure
    todoEmails: 'imeri zitageze ku bo zagenewe',  // TODO: unsure
    todoSpecies: "ubusabe bw'amoko buvuye kuri pepiniyeri", // TODO: Kinyarwanda to review
    todoNone: 'Nta kintu gikeneye ko ucyitaho ubu.',  // TODO: unsure
  },
  rules: {
    title: "Amategeko n'amoko",
    intro: "Ibipimo by'amategeko y'ibyago n'amoko y'ibimera n'igihe bimara bikura. Buri mpinduka yandikwa mu mateka.",
    thresholds: "Amategeko y'ibyago by'ibirenze",
    thresholdsHint: "Impinduka zikurikizwa ku igenzura rikurikira. Ibisanzwe biva mu bushakashatsi (Imbonerahamwe ya 5).",
    lookback: 'Iminsi y\'igurisha irebwa',
    lookbackHint: "Umuvuduko w'igurisha ubarwa hakurikijwe iyi minsi ya vuba.",
    medium: 'Ibyago biri hagati guhera kuri (%)',
    high: 'Ibyago biri hejuru guhera kuri (%)',
    percentHint: "Igice cy'icyiciro gishobora kutagurishwa.",
    far: 'Imipaka "kure" (iminsi isigaye)',
    near: 'Imipaka "hafi" (iminsi isigaye)',
    margin: "Inyongera y'umutekano yo gutera (%)",
    marginHint: 'Ibyongerwa ku nama zo gutera.',
    save: 'Bika amategeko',
    saved: 'Amategeko yabitswe.',
  },
  species: {
    title: "Amoko y'ibimera",
    add: 'Ongeraho ubwoko',
    edit: 'Hindura',
    archive: 'Bika mu mateka',
    restore: 'Garura',
    showArchived: 'Erekana ibyabitswe mu mateka',
    archivedLabel: 'Byabitswe mu mateka',
    archiveConfirm: 'Kuki ubika ubu bwoko mu mateka? Ibyiciro bisanzweho biraguma.',
    archived: 'Ubwoko bwabitswe mu mateka.',
    restored: 'Ubwoko bwagaruwe.',
    saved: 'Ubwoko bwabitswe.',
    name: 'Izina rizwi',
    rwName: 'Izina mu Kinyarwanda',
    category: 'Icyiciro',
    daysToReady: 'Iminsi kugeza yiteguye',
    primeDays: "Igihe cyiza (iminsi)",
    override: "Itegeko ryihariye ry'igihe cyiza (iminsi)",
    summary: "yitegura nyuma y'iminsi {ready}, igihe cyiza iminsi {prime}",
    overridden: 'itegeko ryihariye',
    empty: 'Nta moko arahari. Ongeraho ubwa mbere ukoresheje "Ongeraho ubwoko", cyangwa wemeze ubusabe bwa pepiniyeri.', // TODO: Kinyarwanda to review
    waitingShort: 'bitegereje kwemezwa', // TODO: Kinyarwanda to review
    pendingRequests: "Ubusabe {n} bw'amoko buvuye kuri pepiniyeri butegereje icyemezo cyawe.", // TODO: Kinyarwanda to review
    openRequests: "Fungura ubusabe bw'amoko", // TODO: Kinyarwanda to review
    noneTitle: 'Nta moko arahari', // TODO: Kinyarwanda to review
    noneText: "Umuyobozi agomba kubanza kongeramo amoko (Amategeko n'amoko). Nyuma ushobora kongeramo ibyiciro no kubona inama zo gutera.", // TODO: Kinyarwanda to review
  },
  visibility: {
    title: 'Ingemwe ziboneka', // TODO: Kinyarwanda to review
    batchLabel: "Erekana ibigo iyo ziteguye", // TODO: Kinyarwanda to review
    nurseryLabel: "Erekana ingemwe zanjye ziteguye ibigo byemejwe", // TODO: Kinyarwanda to review
    whatTheySee: "Ibigo bibona gusa ubwoko, umubare ushobora gutanga, igiciro cy'ingemwe niba gihari, izina rya pepiniyeri n'akarere. Ntibibona ibyo wagurishije, ibyo wakoresheje, ibyago cyangwa telefoni yawe.", // TODO: Kinyarwanda to review
    hidden: 'Zihishwe ibigo', // TODO: Kinyarwanda to review
    nurseryOn: 'Ingemwe zawe ziteguye zigaragara ku bigo byemejwe.', // TODO: Kinyarwanda to review
    nurseryOff: 'Ingemwe zawe zihishwe ibigo. Ibirenze ushyize ku rubuga biracyagaragara.', // TODO: Kinyarwanda to review
  },
  speciesRequests: {
    title: "Ubusabe bw'amoko", // TODO: Kinyarwanda to review
    search: 'Shakisha ubwoko cyangwa pepiniyeri', // TODO: Kinyarwanda to review
    nursery: 'Pepiniyeri', // TODO: Kinyarwanda to review
    batches: 'Ibyiciro', // TODO: Kinyarwanda to review
    batchCount: 'Ibyiciro {n}, ingemwe {plants}', // TODO: Kinyarwanda to review
    date: 'Byasabwe', // TODO: Kinyarwanda to review
    requestedOn: 'Byasabwe ku wa {date}', // TODO: Kinyarwanda to review
    decided: 'Icyemezo', // TODO: Kinyarwanda to review
    status: { pending: 'Bitegereje', approved: 'Byemejwe', rejected: 'Byanzwe', merged: 'Byahujwe' }, // TODO: Kinyarwanda to review
    mergedInto: 'Byahujwe na {name}', // TODO: Kinyarwanda to review
    approve: 'Emeza', // TODO: Kinyarwanda to review
    reject: 'Anga', // TODO: Kinyarwanda to review
    merge: 'Huza n\'ubwoko busanzwe', // TODO: Kinyarwanda to review
    approveHint: "Buri cyiciro cy'ubu bwoko kizabona itariki yo kwitegura n'igihe cyiza hakurikijwe aya mategeko, kandi kizajya mu miburo.", // TODO: Kinyarwanda to review
    confirmApprove: 'Emeza ubwoko', // TODO: Kinyarwanda to review
    rejectReason: 'Impamvu (yoherezwa kuri pepiniyeri)', // TODO: Kinyarwanda to review
    confirmReject: 'Anga ubwoko', // TODO: Kinyarwanda to review
    mergeInto: 'Ni igihingwa kimwe na', // TODO: Kinyarwanda to review
    mergeNote: 'Icyitonderwa', // TODO: Kinyarwanda to review
    mergeHint: "Ibyiciro {n} by'ubu busabe bizimurirwa ku bwoko wahisemo bikoreshe amategeko yabwo.", // TODO: Kinyarwanda to review
    confirmMerge: 'Huza', // TODO: Kinyarwanda to review
    closeName: 'izina risa', // TODO: Kinyarwanda to review
    nothingToMerge: 'Nta bwoko bwemejwe buhari bwo guhuza nabwo.', // TODO: Kinyarwanda to review
    possibleDuplicate: 'Bishobora kuba ari kimwe na: {names}. Niba ari igihingwa kimwe, bihuze.', // TODO: Kinyarwanda to review
    approved: 'Ubwoko bwemejwe. Pepiniyeri yamenyeshejwe.', // TODO: Kinyarwanda to review
    rejected: 'Ubwoko bwanzwe. Pepiniyeri yamenyeshejwe.', // TODO: Kinyarwanda to review
    merged: 'Ubwoko bwahujwe. Pepiniyeri yamenyeshejwe.', // TODO: Kinyarwanda to review
    emptyPending: "Nta busabe bw'amoko butegereje.", // TODO: Kinyarwanda to review
    emptyStatus: "Nta busabe bw'amoko bufite uko bihagaze.", // TODO: Kinyarwanda to review
    empty: "Nta busabe bw'amoko buri hano.", // TODO: Kinyarwanda to review
  },
  adminListings: {
    title: "Amatangazo n'ingemwe", // TODO: Kinyarwanda to review
    listings: "Amatangazo y'ibirenze", // TODO: Kinyarwanda to review
    allNurseries: 'Pepiniyeri zose', // TODO: Kinyarwanda to review
    allStages: 'Ibyiciro byose', // TODO: Kinyarwanda to review
    stage: 'Icyiciro', // TODO: Kinyarwanda to review
    inStock: 'Mu bubiko', // TODO: Kinyarwanda to review
    free: 'Izishobora gutangwa', // TODO: Kinyarwanda to review
    shown: 'Zigaragara ku bigo', // TODO: Kinyarwanda to review
    visibility: { all: "Zigaragara n'izihishwe", shown: 'Zigaragara', hidden: 'Zihishwe' }, // TODO: Kinyarwanda to review
    batchOff: 'Byazimijwe kuri iki cyiciro', // TODO: Kinyarwanda to review
    nurseryOff: 'Byazimijwe kuri pepiniyeri yose', // TODO: Kinyarwanda to review
    plantsIntro: "Ibyiciro byose bya pepiniyeri zose zemejwe. \"Zigaragara\" bivuga ko ibigo bizibona mu ngemwe ziboneka ubu.", // TODO: Kinyarwanda to review
    emptyPlants: "Nta cyiciro gihuye n'ibyo washyizeho.", // TODO: Kinyarwanda to review
    intro: "Amatangazo yose y'ibirenze. Kuraho itangazo ritubahiriza amategeko (impamvu irasabwa kandi irandikwa).",
    reason: 'Impamvu yo gukuraho iri tangazo (ibwirwa pepiniyeri kandi irandikwa):',
    status: 'Uko bihagaze',
  },
  audit: {
    title: "Amateka y'ibikorwa",
    intro: 'Uwakoze iki, ryari kandi kuki. Inyandiko ntizisibwa.',
    entity: "Ubwoko bw'inyandiko",
    action: 'Igikorwa',
    from: 'Guhera',
    to: 'Kugeza',
    when: 'Ryari',
    who: 'Nde',
    reason: 'Impamvu',
    system: 'Sisitemu (ubwayo)',
    count: 'Inyandiko {n}',
    previous: 'Ibibanza',
    next: 'Ibikurikira',
    page: 'Ipaji {page} kuri {pages}',
  },
  // TODO(translation review): whole block
  emailProblems: {
    title: 'Imeri zitagezeyo',
    intro: "Imeri zose urubuga rwohereza (kode zo kwemeza, kode zo guhindura ijambo ry'ibanga n'amatangazo) zandikwa hano. Hasi ni imeri zitageze ku bo zagenewe: \"Zanze\" bivuga ko Brevo yazanze cyangwa itabonetse (igisubizo cyayo kigaragazwa); \"Ntizoherejwe\" bivuga ko nta serivisi ya imeri yashyizweho, zagaragajwe gusa kuri seriveri.",
    none: 'Nta imeri yanze cyangwa itoherejwe.',
    skippedHint: 'Ntizoherejwe: nta rufunguzo rwa Brevo (zigaragara kuri seriveri)',
    queued: 'Imeri {n} zitegereje koherezwa.',
    time: 'Igihe',
    type: 'Imeri',
    recipient: 'Uwo yagenewe',
    statusLabel: 'Uko bihagaze',
    attemptsLabel: 'Inshuro',
    error: 'Ikosa ryagarutse',
    retry: 'Ongera ugerageze',
    retryNewCode: 'Ohereza kode nshya',
    retried: 'Byongeye kugeragezwa. Igisubizo: {status}.',
    retriedNewCode: 'Kode nshya yatanzwe (iya mbere ntigikora). Igisubizo: {status}.',
    status: { queued: 'Bitegereje', sent: 'Zoherejwe', failed: 'Zanze', skipped: 'Ntizoherejwe', limited: 'Ntiyoherejwe: konti yasabye kenshi' },
    types: {
      verify_code: 'Kode yo kwemeza',
      reset_code: "Kode yo guhindura ijambo ry'ibanga",
      password_changed: "Ijambo ry'ibanga ryahinduwe",
      alert_created: "Umuburo w'ibirenze",
      request_created: 'Ubusabe bushya',
      request_decided: "Icyemezo ku busabe",
      request_cancelled: 'Ubusabe bwahagaritswe',
      handover_confirmed: 'Ihererekanya ryo kwemeza',
      handover_completed: 'Ihererekanya ryarangiye',
      listing_expired: 'Itangazo ryarangiye',
      verification_approved: 'Konti yemejwe',
      verification_rejected: 'Gukosora birasabwa',
      species_requested: "Ubusabe bw'ubwoko", // TODO: Kinyarwanda to review
      species_approved: 'Ubwoko bwemejwe', // TODO: Kinyarwanda to review
      species_rejected: 'Ubwoko bwanzwe', // TODO: Kinyarwanda to review
      species_merged: 'Ubwoko bwahujwe', // TODO: Kinyarwanda to review
      record_archived: "Byabitswe n'umuyobozi", // TODO: Kinyarwanda to review
      record_restored: "Byagaruwe n'umuyobozi", // TODO: Kinyarwanda to review
      support_ticket_created: "Ubusabe bushya bw'ubufasha", // TODO: Kinyarwanda to review
      support_user_replied: "Igisubizo ku busabe bw'ubufasha", // TODO: Kinyarwanda to review
      support_reopened: "Ubusabe bw'ubufasha bwongeye gufungurwa", // TODO: Kinyarwanda to review
      support_admin_replied: "Ubusabe bw'ubufasha bwasubijwe", // TODO: Kinyarwanda to review
      support_resolved: "Ubusabe bw'ubufasha bwakemuwe", // TODO: Kinyarwanda to review
    },
  },
  // TODO(translation review): whole block
  code: {
    verify: 'Emeza', // TODO: unsure
    differentEmail: 'Koresha indi imeri', // TODO: unsure
    fromLogin: "Imeri yawe ntiraremezwa. Andika kode y'imibare 6 iri muri imeri yawe, cyangwa usabe kode nshya.", // TODO: unsure
    verifiedTitle: 'Imeri yawe yemejwe.', // TODO: unsure
    nextStep: "Ibikurikiraho: umuyobozi agenzura amakuru yawe. Uzabona imeri konti yawe imaze kwemezwa; hagati aho ushobora kongeraho inyandiko zishyigikira hasi.", // TODO: unsure
    verifiedSignIn: 'Imeri yawe yemejwe. Injira.', // TODO: unsure
    label: 'Kode y\'imibare 6',
    hint: 'Andika cyangwa ushyiremo kode iri muri imeri.',
    verifyTitle: 'Andika kode yawe',
    sentTo: 'Twohereje kode y\'imibare 6 kuri {email}. Imara iminota 10.',
    resetSentTo: 'Niba {email} yanditswe, twayoherereje kode y\'imibare 6. Imara iminota 10.',
    enterEmail: 'Andika imeri yawe na kode y\'imibare 6 iri muri imeri.',
    confirm: 'Emeza',
    resend: 'Ongera wohereze kode',
    resendIn: 'Ongera wohereze kode mu masegonda {s}',
    resent: 'Niba aderesi yanditswe, kode nshya iri mu nzira. Kode ya mbere ntigikora.',
    sendFailed: 'Ntitwashoboye kohereza imeri ubu. Tegereza gato maze ukande "Ongera wohereze kode".',
    spamHint: 'Nta imeri ubonye nyuma y\'iminota mike? Reba muri spam, hanyuma wongere wohereze kode.',
    getCode: 'Andika kode yanjye yo kwemeza',
    forgotIntro: "Andika imeri yawe. Niba yanditswe, tuzakoherereza kode y'imibare 6 yo guhitamo ijambo ry'ibanga rishya.",
    sendCode: 'Ohereza kode',
  },
  errors: {
    NETWORK_ERROR: 'Ntidushobora kugera kuri seriveri. Reba interineti yawe wongere ugerageze.',
    SERVER_ERROR: 'Habaye ikibazo. Ongera ugerageze.',
    INVALID_CREDENTIALS: "Imeri cyangwa ijambo ry'ibanga si byo.",
    EMAIL_NOT_VERIFIED: 'Banza wemeze imeri yawe.',
    ACCOUNT_SUSPENDED: "Iyi konti yarahagaritswe. Vugana n'umuyobozi.",
    EMAIL_TAKEN: "Iyi imeri isanzwe yanditswe. Gerageza kwinjira cyangwa guhindura ijambo ry'ibanga.",
    CODE_INVALID: "Nta kode ikora y'iyi aderesi. Saba kode nshya.", // TODO: unsure
    CODE_EXPIRED: 'Iyi kode yarangiye (kode imara iminota 10). Saba kode nshya.', // TODO: unsure
    WRONG_CODE: 'Kode si yo. Usigaje kugerageza inshuro {n}.', // TODO: unsure
    TOO_MANY_ATTEMPTS: 'Wagerageje kenshi. Iyi kode ntigikora: saba kode nshya.', // TODO: unsure
    ALREADY_VERIFIED: 'Iyi imeri isanzwe yemejwe. Ushobora kwinjira.', // TODO: unsure
    NOTHING_TO_RETRY: 'Iyi imeri yamaze koherezwa.', // TODO: unsure
    CSRF_FAILED: "Igenzura ry'umutekano ryanze. Ongera ufungure ipaji ugerageze.",
    TOO_MANY_REQUESTS: 'Wagerageje kenshi. Tegereza iminota mike wongere ugerageze.',
    NOT_AUTHENTICATED: 'Banza winjire.',
    FORBIDDEN: 'Nta burenganzira ufite kuri ibi.',
    NOT_FOUND: 'Ntibibonetse. Bishobora kuba byakuweho.',
    HAS_HISTORY: 'Ibi bifite amateka, bishobora kubikwa gusa.', // TODO: Kinyarwanda to review
    ALREADY_ARCHIVED: 'Ibi byari bisanzwe bibitswe.', // TODO: Kinyarwanda to review
    NOT_ARCHIVED: 'Ibi ntibibitswe.', // TODO: Kinyarwanda to review
    NURSERY_ARCHIVED: "Pepiniyeri y'iki cyiciro yabitswe. Banza ugarure pepiniyeri.", // TODO: Kinyarwanda to review
    ARCHIVED: 'Ibi byabitswe. Banza ubigarure.', // TODO: Kinyarwanda to review
    NOT_PUBLISHED: "Banza ushyire icyiciro ku rupapuro rw'imbere.", // TODO: Kinyarwanda to review
    ACCOUNT_ARCHIVED: "Iyi konti yabitswe n'umuyobozi. Vugana n'umuyobozi.", // TODO: Kinyarwanda to review
    ROUTE_NOT_FOUND: 'Iki gice ntikiboneka ubu. Ongera ugerageze mu minota mike.', // TODO: unsure
    PAGE_FAILED: 'Iyi paji ntiyashoboye kugaragara. Ongera ugerageze.', // TODO: unsure
    TIMEOUT: 'Seriveri yatinze gusubiza. Ishobora kuba irimo gukanguka; ongera ugerageze.', // TODO: unsure
    NOT_APPROVED: 'Konti yawe igomba kubanza kwemezwa n\'umuyobozi.',
    ALREADY_DECIDED: 'Iki cyamaze gufatirwa icyemezo.',
    FILE_TOO_LARGE: 'Inyandiko irengeje MB 10.',
    UNSUPPORTED_FILE_TYPE: 'Hemerwa PDF, PNG na JPEG gusa.',
    FILE_REQUIRED: 'Hitamo inyandiko.',
    VALIDATION_FAILED: 'Reba ibice byagaragajwe.',
    DUPLICATE: 'Iyi nyandiko isanzwe ihari.',
    TICKET_RESOLVED: "Ubu busabe bwakemuwe. Bwongere ufungure kugira ngo wandike.", // TODO: Kinyarwanda to review
    REOPEN_EXPIRED: "Ubu busabe bwakemuwe hashize iminsi irenga 14. Ohereza ubushya.", // TODO: Kinyarwanda to review
    NOT_RESOLVED: "Ubu busabe buracyafunguye.", // TODO: Kinyarwanda to review
    PUBLIC_TICKET: "Uyu muntu nta konti afite. Musubize kuri imeri.", // TODO: Kinyarwanda to review
    SALE_EXCEEDS_STOCK: 'Ingemwe ntizihagije: {available} gusa ni zo zishobora kugurishwa.',
    STOCK_TOO_LOW: 'Ingemwe ziri muri iki cyiciro ntizihagije kuri iyi mpinduka.',
    LISTING_EXCEEDS_STOCK: 'Ingemwe ntizihagije: {available} gusa ni zo zishobora gutangwa.',
    BATCH_CLEARED: 'Iki cyiciro cyarangiye.',
    BATCH_HAS_LISTINGS: "Banza ufunge amatangazo n'ubusabe bifunguye by'iki cyiciro.", // TODO: Kinyarwanda to review
    NOT_AVAILABLE: 'Izi ngemwe ntizikiboneka.', // TODO: Kinyarwanda to review
    INVALID_STATUS_CHANGE: 'Iyi mpinduka ntigishoboka.',
    LISTING_CLOSED: 'Iri tangazo ntirigifunguye.',
    NOT_ENOUGH_LEFT: 'Ingemwe zisigaye ntizihagije: {remaining} gusa.',
    ALREADY_FULFILLED: 'Wamaze kwakira ingemwe z\'iri tangazo.',
    NOT_APPROVED_YET: 'Ubusabe bugomba kubanza kwemezwa.',
    REQUEST_CLOSED: 'Ubu busabe bwamaze gufungwa.',
    UNKNOWN_TYPE: "Ubwoko bw'inyandiko butazwi.",
    SIMILAR_SPECIES: 'Hari ubwoko busa n\'ubu busanzwe. Buhitemo, cyangwa wemeze ko ubwawe ari bushya.', // TODO: Kinyarwanda to review
    SPECIES_NOT_APPROVED: "Iki cyiciro gitegereje kwemezwa k'ubwoko, ntikirashobora gutangwa.", // TODO: Kinyarwanda to review
    SPECIES_EXISTS: 'Hari ubwoko busanzwe bufite iri zina. Koresha "Huza n\'ubwoko busanzwe".', // TODO: Kinyarwanda to review
    SPECIES_LOCKED: "Ubwoko bw'iki cyiciro bwemejwe, ntibushobora guhindurwa.", // TODO: Kinyarwanda to review
    SPECIES_REJECTED: 'Ubu bwoko bwanzwe. Hitamo ubundi bwoko.', // TODO: Kinyarwanda to review
  },
  fieldErrors: {
    required: 'Iki gice kigomba kuzuzwa.',
    invalid_email: 'Andika imeri nyayo.',
    weak_password: "Koresha nibura inyuguti 8 harimo inyuguti n'umubare.",
    invalid_phone: 'Andika nimero ya telefoni nyayo, urugero +250 788 000 000.',
    invalid_choice: 'Hitamo kimwe mu biri ku rutonde.',
    too_long: 'Ni birebire cyane.',
    too_short: 'Andika ibindi bike.', // TODO: Kinyarwanda to review
    invalid: 'Ibi ntibyemewe.',
    invalid_code: 'Andika imibare 6 ya kode.', // TODO: unsure
    invalid_quantity: "Andika umubare wuzuye w'ingemwe.",
    invalid_amount: 'Andika amafaranga y\'u Rwanda yuzuye.',
    invalid_date: 'Andika itariki nyayo.',
    date_in_past: 'Itariki yo kurangira igomba kuba uyu munsi cyangwa nyuma, kandi nyuma y\'itariki yo gutangira.',
    before_ready: "Igihe cyiza ntikirangira mbere y'itariki yo kwitegura.",
    invalid_location: 'Ikimenyetso kigomba kuba mu Rwanda.',
    must_be_below_high: "Hagati igomba kuba munsi ya Hejuru.",
    must_be_below_far: 'Imipaka "hafi" igomba kuba munsi ya "kure".',
    duplicate: 'Iri zina risanzwe rihari.', // TODO: Kinyarwanda to review
  },
  records: {
    nurseries: 'Pepiniyeri', // TODO: Kinyarwanda to review
    institutions: 'Ibigo', // TODO: Kinyarwanda to review
    batches: 'Ibyiciro', // TODO: Kinyarwanda to review
    requests: 'Ubusabe', // TODO: Kinyarwanda to review
    status: { active: 'Bikora', archived: 'Byabitswe', all: 'Byose' }, // TODO: Kinyarwanda to review
    archivedOn: 'Byabitswe {date}', // TODO: Kinyarwanda to review
    registeredOn: 'Byanditswe {date}', // TODO: Kinyarwanda to review
    owner: 'Konti', // TODO: Kinyarwanda to review
    ownerName: 'Izina rya nyirayo', // TODO: Kinyarwanda to review
    contactPerson: 'Uwo kuvugana na we', // TODO: Kinyarwanda to review
    phone: 'Telefoni', // TODO: Kinyarwanda to review
    linked: 'Inyandiko bifitanye isano', // TODO: Kinyarwanda to review
    nothingLinked: 'Nta nyandiko ifitanye isano n\'ibi.', // TODO: Kinyarwanda to review
    links: {
      batches: 'Ibyiciro {n}',
      sales: 'Igurisha {n}',
      expenses: 'Amafaranga yakoreshejwe {n}',
      listings: 'Amatangazo {n}',
      requests: 'Ubusabe {n}',
      species_requests: "Ubusabe bw'amoko {n}",
      planting_suggestions: 'Inama zo gutera {n}',
      stock_changes: "Impinduka z'ububiko {n}",
      alerts: 'Imiburo {n}',
    }, // TODO: Kinyarwanda to review
    searchNursery: 'Shakisha pepiniyeri, nyirayo cyangwa imeri', // TODO: Kinyarwanda to review
    searchInstitution: 'Shakisha ikigo, uwo kuvugana na we cyangwa imeri', // TODO: Kinyarwanda to review
    empty: 'Nta kintu hano.', // TODO: Kinyarwanda to review
    edit: 'Hindura', // TODO: Kinyarwanda to review
    editReason: 'Impamvu (ibikwa mu bubiko bw\'ibikorwa)', // TODO: Kinyarwanda to review
    archive: 'Bika', // TODO: Kinyarwanda to review
    unarchive: 'Garura', // TODO: Kinyarwanda to review
    delete: 'Siba', // TODO: Kinyarwanda to review
    reason: 'Impamvu (irasabwa, ibikwa mu bubiko bw\'ibikorwa)', // TODO: Kinyarwanda to review
    archiveTitle: 'Kubika {name}?', // TODO: Kinyarwanda to review
    archiveEffect: {
      nursery: "Konti ntishobora kwinjira cyangwa gushyiraho ibintu, kandi pepiniyeri ivanwa ku rutonde, ku rubuga no ku rupapuro rw'imbere. Ubusabe bufunguye burahagarikwa kandi abandi babimenyeshwa. Amateka yose arabikwa.",
      institution: 'Konti ntishobora kwinjira cyangwa gusaba. Ubusabe bwayo bufunguye burahagarikwa kandi pepiniyeri zibimenyeshwa. Amateka yose arabikwa.',
      batch: "Icyiciro kivanwa mu bubiko, mu miburo, mu matangazo no ku rupapuro rw'imbere. Ubusabe bufunguye burahagarikwa. Igurisha n'ubusabe biguma mu mateka.",
    }, // TODO: Kinyarwanda to review
    archived: 'Byabitswe. Ubusabe {requests} bwahagaritswe, amatangazo {listings} yakuweho. Nyirabyo yamenyeshejwe.', // TODO: Kinyarwanda to review
    unarchiveTitle: 'Kugarura {name}?', // TODO: Kinyarwanda to review
    unarchiveText: 'Byose biragaruka. Ubusabe bwahagaritswe buguma bwahagaritswe.', // TODO: Kinyarwanda to review
    unarchived: 'Byagaruwe. Nyirabyo yamenyeshejwe.', // TODO: Kinyarwanda to review
    deleteTitle: 'Gusiba {name} burundu?', // TODO: Kinyarwanda to review
    deleteText: 'Ntibishobora gusubizwa. Bikora gusa iyo nta nyandiko ifitanye isano; bitabaye ibyo, bika.', // TODO: Kinyarwanda to review
    deleted: "Byasibwe burundu. Ububiko bw'ibikorwa burabyandika.", // TODO: Kinyarwanda to review
    hasHistory: 'Ibi bifite amateka, ntibishobora gusibwa. Byibike: bivanwa mu mikoreshereze, amateka akaguma.', // TODO: Kinyarwanda to review
    archiveInstead: 'Bika aho gusiba', // TODO: Kinyarwanda to review
    nurseryArchived: 'pepiniyeri yabitswe', // TODO: Kinyarwanda to review
    stock: 'Ububiko (ubu / mu ntangiriro)', // TODO: Kinyarwanda to review
    stockChanges: "Impinduka z'ububiko", // TODO: Kinyarwanda to review
    quantityChange: 'Gukosora umubare (+ cyangwa -)', // TODO: Kinyarwanda to review
    quantityChangeHint: 'Urugero -5 ku ngemwe zapfuye. Impamvu irasabwa.', // TODO: Kinyarwanda to review
  },
  homepage: {
    title: "Urupapuro rw'imbere", // TODO: Kinyarwanda to review
    consentTitle: "Urupapuro rw'imbere rusange", // TODO: Kinyarwanda to review
    consentLabel: "Emerera ingemwe zanjye kugaragara ku rupapuro rw'imbere rusange", // TODO: Kinyarwanda to review
    consentText: "Umuyobozi ashobora kwerekana bimwe mu byiciro byawe biteguye ku rupapuro rw'imbere: ubwoko, umubare uboneka, igiciro cy'ingemwe niba gihari, iherezo ry'igihe cyiza, izina rya pepiniyeri n'akarere. Ntibigaragaza telefoni yawe, igurisha cyangwa aho uri neza.", // TODO: Kinyarwanda to review
    consentOn: "Ingemwe zawe zishobora kugaragara ku rupapuro rw'imbere.", // TODO: Kinyarwanda to review
    consentOff: "Ingemwe zawe ntizikigaragara ku rupapuro rw'imbere.", // TODO: Kinyarwanda to review
    consentYes: 'Yemeye', // TODO: Kinyarwanda to review
    consentNo: 'Ntiyemeye', // TODO: Kinyarwanda to review
    consentShort: "Yemeye urupapuro rw'imbere", // TODO: Kinyarwanda to review
    adminIntro: "Shyira ibyiciro biteguye ku rupapuro rw'imbere, kimwe kimwe cyangwa byinshi icyarimwe. Ibyiciro bifite ingemwe ziboneka, bya pepiniyeri zemejwe kandi zabyemeye, ni byo byonyine bishobora gushyirwaho.", // TODO: Kinyarwanda to review
    publish: "Shyira ku rupapuro rw'imbere", // TODO: Kinyarwanda to review
    unpublish: "Kura ku rupapuro rw'imbere", // TODO: Kinyarwanda to review
    publishSelected: 'Shyiraho ibyatoranyijwe', // TODO: Kinyarwanda to review
    unpublishSelected: 'Kuraho ibyatoranyijwe', // TODO: Kinyarwanda to review
    select: 'Hitamo', // TODO: Kinyarwanda to review
    selectBatch: 'Hitamo icyiciro #{id}', // TODO: Kinyarwanda to review
    selectedCount: 'Byatoranyijwe {n}', // TODO: Kinyarwanda to review
    onHomepage: "Kiri ku rupapuro rw'imbere", // TODO: Kinyarwanda to review
    onHomepageRank: "Kiri ku rupapuro rw'imbere · umwanya {n}", // TODO: Kinyarwanda to review
    publishedHidden: 'Cyashyizweho, gihishwe ubu', // TODO: Kinyarwanda to review
    notPublished: 'Ntikirashyirwaho', // TODO: Kinyarwanda to review
    publishedCount: 'Byashyizweho {n}.', // TODO: Kinyarwanda to review
    unpublishedCount: "Byakuwe ku rupapuro rw'imbere {n}.", // TODO: Kinyarwanda to review
    featured: "Umwanya w'imbere", // TODO: Kinyarwanda to review
    featuredHint: 'Umwanya 1 ugaragara mbere. Siga ubusa niba atari ngombwa.', // TODO: Kinyarwanda to review
    primeEnd: "Iherezo ry'igihe cyiza", // TODO: Kinyarwanda to review
    filter: { all: "Urupapuro rw'imbere: byose", shown: "Biri ku rupapuro rw'imbere ubu", yes: 'Byashyizweho', no: 'Ntibirashyirwaho' }, // TODO: Kinyarwanda to review
    block: {
      BATCH_ARCHIVED: 'icyiciro cyabitswe',
      NURSERY_ARCHIVED: 'pepiniyeri yabitswe',
      NURSERY_NOT_APPROVED: 'pepiniyeri ntiremezwa',
      NURSERY_NO_CONSENT: "pepiniyeri ntiremera urupapuro rw'imbere (Igenamiterere)",
      SPECIES_NOT_APPROVED: 'ubwoko ntiburemezwa',
      NOT_READY: 'icyiciro ntikiriteguye',
      NO_STOCK: 'nta ngemwe ziboneka zisigaye',
      NOT_FOUND: 'ntibibonetse',
    }, // TODO: Kinyarwanda to review
  },
  adminSales: {
    title: 'Igurisha', // TODO: Kinyarwanda to review
    intro: "Igurisha ryose ryanditswe na pepiniyeri zose, harimo iryahujwe rivuye nta murandasi. Igiteranyo kibara igurisha ryose rihuye n'ibyo washyizeho.", // TODO: Kinyarwanda to review
    search: 'Shakisha pepiniyeri, ubwoko cyangwa icyitonderwa', // TODO: Kinyarwanda to review
    periods: { today: 'Uyu munsi', week: 'Iki cyumweru', month: 'Uku kwezi', year: 'Uyu mwaka', custom: 'Amatariki wihitiyemo', all: 'Igihe cyose' }, // TODO: Kinyarwanda to review
    from: 'Guhera', // TODO: Kinyarwanda to review
    to: 'Kugeza', // TODO: Kinyarwanda to review
    range: '{from} kugeza {to}', // TODO: Kinyarwanda to review
    amount: "Igiteranyo cy'igurisha (RWF)", // TODO: Kinyarwanda to review
    count: "Umubare w'igurisha", // TODO: Kinyarwanda to review
    plants: 'Ingemwe zagurishijwe', // TODO: Kinyarwanda to review
    quantity: 'Ingemwe', // TODO: Kinyarwanda to review
    note: "Icyitonderwa cy'ubwishyu", // TODO: Kinyarwanda to review
    records: "Inyandiko z'igurisha", // TODO: Kinyarwanda to review
    limited: 'Hagaragara igurisha {n} rya vuba muri {total}. Kuramo CSV kugira ngo ubone ryose.', // TODO: Kinyarwanda to review
    empty: 'Nta gurisha muri iki gihe.', // TODO: Kinyarwanda to review
    byNursery: 'Kuri buri pepiniyeri', // TODO: Kinyarwanda to review
    bySpecies: 'Kuri buri bwoko', // TODO: Kinyarwanda to review
    export: 'Kuramo CSV', // TODO: Kinyarwanda to review
  },
  privacy: {
    salesVisible: "Umuyobozi abasha kubona igiteranyo n'inyandiko z'igurisha ryawe, kugira ngo apime umusaruro kandi afashe pepiniyeri nto.", // TODO: Kinyarwanda to review
  },
  support: {
    helpTitle: "Ubufasha", // TODO: Kinyarwanda to review
    helpIntro: "Ufite ikibazo kuri porogaramu? Andikira umuyobozi hano. Igisubizo ukibona kuri uru rupapuro no kuri imeri.", // TODO: Kinyarwanda to review
    contactAdmin: "Vugana n’umuyobozi", // TODO: Kinyarwanda to review
    category: "Icyiciro", // TODO: Kinyarwanda to review
    categories: { account: "Konti", batches: "Ibyiciro by’ingemwe", requests: "Ubusabe", sales: "Igurisha", technical: "Ikibazo cya tekiniki", other: "Ibindi" }, // TODO: Kinyarwanda to review
    subject: "Ingingo", // TODO: Kinyarwanda to review
    message: "Ubutumwa", // TODO: Kinyarwanda to review
    addScreenshot: "Ongeraho ifoto ya ekarani", // TODO: Kinyarwanda to review
    screenshotHint: "Si ngombwa. PNG cyangwa JPEG, kugeza kuri MB 5.", // TODO: Kinyarwanda to review
    removeScreenshot: "Kuraho ifoto", // TODO: Kinyarwanda to review
    screenshotType: "Hemerwa amafoto ya PNG cyangwa JPEG gusa.", // TODO: Kinyarwanda to review
    screenshotSize: "Ifoto irenze MB 5.", // TODO: Kinyarwanda to review
    attached: "Byoherejwe hamwe n’ubusabe bwawe: {name} · {role} · {organisation} · {email}", // TODO: Kinyarwanda to review
    send: "Ohereza ku muyobozi", // TODO: Kinyarwanda to review
    sent: "Byoherejwe. Umuyobozi azagusubiza hano no kuri imeri.", // TODO: Kinyarwanda to review
    savedOffline: "Byabitswe kuri telefoni. Bizoherezwa umaze kubona interineti.", // TODO: Kinyarwanda to review
    waitingToSend: "Bitegereje koherezwa", // TODO: Kinyarwanda to review
    discard: "Kureka", // TODO: Kinyarwanda to review
    myMessages: "Ubutumwa bwanjye", // TODO: Kinyarwanda to review
    empty: "Nta butumwa burahari", // TODO: Kinyarwanda to review
    emptyText: "Ukeneye ubufasha? Kanda \"Vugana n’umuyobozi\".", // TODO: Kinyarwanda to review
    conversation: "Ikiganiro", // TODO: Kinyarwanda to review
    fromAdmin: "Umuyobozi", // TODO: Kinyarwanda to review
    internalNote: "Icyitonderwa cy’imbere", // TODO: Kinyarwanda to review
    screenshot: "Ifoto", // TODO: Kinyarwanda to review
    reply: "Igisubizo cyawe", // TODO: Kinyarwanda to review
    sendReply: "Ohereza igisubizo", // TODO: Kinyarwanda to review
    replySent: "Igisubizo cyoherejwe.", // TODO: Kinyarwanda to review
    wasSolved: "Byakemutse?", // TODO: Kinyarwanda to review
    yes: "Yego", // TODO: Kinyarwanda to review
    no: "Oya", // TODO: Kinyarwanda to review
    thanks: "Murakoze ku gisubizo cyanyu.", // TODO: Kinyarwanda to review
    saidSolved: "Igisubizo: byakemutse", // TODO: Kinyarwanda to review
    saidNotSolved: "Igisubizo: ntibyakemutse", // TODO: Kinyarwanda to review
    reopen: "Ongera ufungure", // TODO: Kinyarwanda to review
    reopened: "Byongeye gufungurwa. Umuyobozi yabimenyeshejwe.", // TODO: Kinyarwanda to review
    reopenExpired: "Byakemuwe hashize iminsi irenga 14. Ohereza ubusabe bushya niba ugikeneye ubufasha.", // TODO: Kinyarwanda to review
    adminTitle: "Ubufasha", // TODO: Kinyarwanda to review
    search: "Shakisha ingingo, izina cyangwa imeri", // TODO: Kinyarwanda to review
    role: "Bivuye kuri", // TODO: Kinyarwanda to review
    roles: { operator: "Pepiniyeri", institution: "Ikigo", public: "Usura urubuga (ifishi)" }, // TODO: Kinyarwanda to review
    received: "Byakiriwe", // TODO: Kinyarwanda to review
    allCategories: "Ibyiciro byose", // TODO: Kinyarwanda to review
    allRoles: "Bose", // TODO: Kinyarwanda to review
    adminEmpty: "Nta busabe bw’ubufasha.", // TODO: Kinyarwanda to review
    from: "Bivuye kuri", // TODO: Kinyarwanda to review
    resolvedOn: "Byakemuwe", // TODO: Kinyarwanda to review
    publicHint: "Uyu muntu nta konti afite: musubize kuri imeri. Ibyitonderwa wandika hano biguma imbere.", // TODO: Kinyarwanda to review
    noteLabel: "Icyitonderwa cy’imbere (abayobozi bonyine)", // TODO: Kinyarwanda to review
    internalCheckbox: "Icyitonderwa cy’imbere: abayobozi bonyine ni bo bakibona", // TODO: Kinyarwanda to review
    saveNote: "Bika icyitonderwa", // TODO: Kinyarwanda to review
    noteSaved: "Icyitonderwa cyabitswe.", // TODO: Kinyarwanda to review
    replyByEmail: "Subiza kuri imeri", // TODO: Kinyarwanda to review
    markInProgress: "Biri gukorwaho", // TODO: Kinyarwanda to review
    markResolved: "Byakemuwe", // TODO: Kinyarwanda to review
    markOpen: "Ongera ufungure", // TODO: Kinyarwanda to review
    statusSaved: "Uko bihagaze byabitswe.", // TODO: Kinyarwanda to review
  },
  contact: {
    title: "Vugana n’umuyobozi", // TODO: Kinyarwanda to review
    intro: "Ntushobora kwinjira, utegereje kwemezwa, cyangwa ufite ikibazo? Twandikire. Nta konti ikenewe.", // TODO: Kinyarwanda to review
    cannotSignIn: "Ntushobora kwinjira? Vugana n’umuyobozi", // TODO: Kinyarwanda to review
    name: "Izina ryawe", // TODO: Kinyarwanda to review
    message: "Ubutumwa bwawe", // TODO: Kinyarwanda to review
    privacy: "Ubutumwa bwawe bugera ku muyobozi gusa. Ntibugaragazwa ku mugaragaro.", // TODO: Kinyarwanda to review
    send: "Ohereza ubutumwa", // TODO: Kinyarwanda to review
    sent: "Murakoze. Umuyobozi azagusubiza kuri imeri.", // TODO: Kinyarwanda to review
  },
  privacyPolicy: {
    title: "Politiki y'ibanga",  // TODO: Kinyarwanda to check
    updated: "Byavuguruwe bwa nyuma: 19 Ugushyingo 2026",  // TODO: Kinyarwanda to check
    intro: "Iyi paji isobanura amakuru Smart Green Hub ibika ku bijyanye nawe, impamvu, abashobora kuyabona, n'ibyo ushobora gusaba. Ikurikiza Itegeko N° 058/2021 ryo mu Rwanda rirengera amakuru bwite n'ubuzima bwite.",  // TODO: Kinyarwanda to check
    footer: "Politiki y'ibanga",  // TODO: Kinyarwanda to check
    registerNote: "Uko dukoresha amakuru yawe:",  // TODO: Kinyarwanda to check
    readPolicy: "soma Politiki y'ibanga",  // TODO: Kinyarwanda to check
    who: {
      title: "Ushinzwe amakuru",  // TODO: Kinyarwanda to check
      points: "Smart Green Hub icungwa n'umuyobozi wayo, Sarah Kasande, umunyeshuri wiga ubuhanga bwa porogaramu muri African Leadership University (ALU) i Kigali, nk'umushinga wo gusoza amasomo.\nKugira ngo uvugane n'umuyobozi, koresha Ubufasha muri porogaramu cyangwa ifishi yo kutwandikira iri ku ipaji ibanza.",  // TODO: Kinyarwanda to check
    },
    collect: {
      title: "Ibyo tubika",  // TODO: Kinyarwanda to check
      points: "Konti: amazina yose, imeyili, nimero ya telefoni (si ngombwa) n'ururimi ukunda. Ijambobanga ryawe ribikwa ari kode ihishe (bcrypt) gusa, ntiribikwa uko riri.\nPepiniyeri: izina, akarere, umurenge, aderesi cyangwa ikimenyetso (si ngombwa), aho iri ku ikarita (si ngombwa) n'inyandiko zo kwemeza.\nIkigo: izina, ubwoko, akarere, umurenge, nimero ya telefoni (si ngombwa) n'inyandiko zo kwemeza.\nIbyo wandika: ibyiciro by'ingemwe n'amafoto yabyo, ibyagurishijwe, ibyakoreshejwe, impinduka mu bubiko, ingemwe zisagutse, ubusabe n'ihererekanya.\nUbusabe bw'ubufasha n'amafoto yabwo. Ifishi yo kutwandikira ibika izina ryawe, imeyili n'ubutumwa.\nUrutonde rw'ibikorwa by'ingenzi (uwakoze iki, ryari), kugira ngo serivisi itekane.",  // TODO: Kinyarwanda to check
    },
    why: {
      title: "Impamvu tubibika",  // TODO: Kinyarwanda to check
      points: "Gukoresha konti yawe no kugenzura ko buri pepiniyeri n'ikigo bibaho koko mbere yo kubyemeza.\nKubara imiburo y'ibyago n'inama zo gutera bivuye mu makuru yawe bwite.\nGuhuza ingemwe zisagutse n'ibigo no kwemeza ihererekanya.\nGupima umusaruro. Ipaji rusange yerekana igiteranyo gusa, ntiyerekana ibyo pepiniyeri imwe yagurishije.\nGusubiza ubusabe bwawe bw'ubufasha no kurinda umutekano wa serivisi.\nUbushakashatsi bw'igerageza bukoresha amakuru yawe ari uko wabyemeye ukwabyo, kandi raporo ntizigaragaza izina ryawe.",  // TODO: Kinyarwanda to check
    },
    see: {
      title: "Abashobora kubibona",  // TODO: Kinyarwanda to check
      points: "Ubona amakuru yawe bwite. Izindi pepiniyeri n'ibindi bigo ntibishobora kuyafungura.\nUmuyobozi abona ibikenewe mu kwemeza konti no gutanga ubufasha, harimo ibyo pepiniyeri zagurishije n'igiteranyo cyabyo. Pepiniyeri zibimenyeshwa igihe ziyandikisha.\nIkigo kibona izina na telefoni by'uhagarariye pepiniyeri ari uko pepiniyeri imaze kwemera ubusabe bwacyo.\nRubanda rubona pepiniyeri mu rutonde ari uko yahisemo \"Garagaza pepiniyeri yanjye mu rutonde rusange\" (izina, aho iri, uko ivugishwa), n'ingemwe zayo ku ipaji ibanza ari uko yabyemeye muri Igenamiterere (ubwoko, umubare, igiciro, iherezo ry'igihe cyiza, izina rya pepiniyeri n'akarere).\nIbigo bidukoreshereza porogaramu: Vercel na Render (seriveri), Neon (ububiko bw'amakuru), Brevo (kohereza imeyili) na OpenStreetMap (amashusho y'ikarita ashakwa na mushakisha yawe). Ntitugurisha amakuru yawe kandi nta matangazo yamamaza.",  // TODO: Kinyarwanda to check
    },
    where: {
      title: "Aho abikwa",  // TODO: Kinyarwanda to check
      points: "Amakuru yawe abikwa kuri seriveri z'ibyo bigo, ziri hanze y'u Rwanda.\nItegeko ryo mu Rwanda rirengera amakuru bwite (Ingingo ya 29 n'iya 50) risaba kwiyandikisha ku rwego rugenzura mbere yo kubika amakuru bwite hanze y'u Rwanda. Ibi bizemezwa mbere y'uko igerageza rikoresha amakuru nyayo y'abantu.",  // TODO: Kinyarwanda to check
    },
    keep: {
      title: "Igihe tuyabika",  // TODO: Kinyarwanda to check
      points: "Amakuru yawe abikwa igihe cyose konti yawe ikora.\nAmakuru y'ubushakashatsi bw'igerageza abikwa nta mazina muri Google Drive ya ALU y'umushakashatsi, abonwa n'umushakashatsi n'umwarimu umuyobora gusa, mu gihe cy'umwaka umwe nyuma y'ubushakashatsi, hanyuma agasibwa.\nIyo umuyobozi abitse konti mu bubiko, nta muntu ushobora kuyinjiramo kandi ivanwa ku mapaji rusange, ariko amakuru yayo agumaho.\nIyo konti isibwe, izina, imeyili, nimero ya telefoni, inyandiko n'amatangazo byayo bivanwaho. Konti ifitanye isano n'amakuru y'abandi (urugero ihererekanya) ishobora kubikwa mu bubiko gusa, kugira ngo amateka yabo akomeze kuba ukuri.",  // TODO: Kinyarwanda to check
    },
    rights: {
      title: "Amahitamo yawe n'uburenganzira bwawe",  // TODO: Kinyarwanda to check
      points: "Hindura amakuru yawe, kandi ufungure cyangwa ufunge urutonde rusange, ipaji ibanza n'\"Ingemwe zihari\" igihe icyo ari cyo cyose muri Igenamiterere. Gufunga biroroshye nko gufungura.\nSaba kopi y'amakuru yawe, kuyakosora, kuyasiba, guhagarika by'agateganyo kuyakoresha, cyangwa guhagarika ikoreshwa utemera: fungura Ubufasha uhitemo icyiciro \"Konti\". Itegeko riha iminsi 30 yo gusubiza.\nNiba utanyuzwe, ushobora gutanga ikirego ku rwego rugenzura irengerwa ry'amakuru bwite mu Rwanda, Ikigo cy'Igihugu gishinzwe Umutekano w'Ikoranabuhanga (NCSA).",  // TODO: Kinyarwanda to check
    },
    alerts: {
      title: "Imiburo y'ibyago ni inama",  // TODO: Kinyarwanda to check
      points: "Imiburo y'ibyago n'inama zo gutera biva ku mategeko yoroshye asobanurwa muri porogaramu, bityo ushobora kubyibarira.\nNi inama gusa. Porogaramu ntigurisha, ntigabanya igiciro, ntitanga kandi ntishyira ahagaragara ingemwe zawe ku bwayo: ni wowe ufata icyemezo.",  // TODO: Kinyarwanda to check
    },
    security: {
      title: "Uko tuyarinda",  // TODO: Kinyarwanda to check
      points: "Amagambobanga arahishwa, kwinjira bikoresha kuki irinzwe, buri busabe bugenzurwa hakurikijwe uruhare rwawe, kugerageza kenshi biratindishwa, kandi itumanaho rikoresha HTTPS.\nIbikorwa by'ingenzi by'umuyobozi byandikwa mu gitabo cy'igenzura.\nAmakuru nasohoka mu buryo butemewe, urwego rugenzura ruzabimenyeshwa mu masaha 48, nawe ubimenyeshwe niba bigushyira mu kaga gakomeye.",  // TODO: Kinyarwanda to check
    },
    storage: {
      title: "Kuki na telefoni yawe",  // TODO: Kinyarwanda to check
      points: "Kuki imwe ituma uguma winjiye kugeza ku minsi 7, indi ikarinda amafishi yawe. Nta kuki zigukurikirana cyangwa z'amatangazo zihari.\nTelefoni yawe ibika ururimi n'uburyo bwo kugaragaza wahisemo, n'ibyanditswe nta murandasi kugeza byoherejwe. Gusohoka bisiba kopi yabitswe kuri telefoni.",  // TODO: Kinyarwanda to check
    },
    changes: {
      title: "Impinduka kuri iyi politiki",  // TODO: Kinyarwanda to check
      points: "Itariki iri hejuru yerekana verisiyo iheruka. Impinduka z'ingenzi zizanatangazwa muri porogaramu.",  // TODO: Kinyarwanda to check
    },
  },
  notFound: { title: 'Ipaji ntibonetse', text: 'Ipaji ushaka ntibaho.', home: 'Jya ahabanza' },
}

export default rw
