// Supported languages
export type Locale = 'en' | 'pt' | 'es' | 'fr' | 'de';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'pt', 'es', 'fr', 'de'];

export const LOCALE_NAMES: Record<Locale, string> = {
    en: 'English',
    pt: 'Portugues',
    es: 'Espanol',
    fr: 'Francais',
    de: 'Deutsch',
};

// Translation keys type
export interface Translations {
    // Common
    common: {
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        create: string;
        update: string;
        search: string;
        loading: string;
        error: string;
        success: string;
        warning: string;
        info: string;
        confirm: string;
        back: string;
        next: string;
        previous: string;
        close: string;
        open: string;
        yes: string;
        no: string;
        all: string;
        none: string;
        select: string;
        filter: string;
        clear: string;
        refresh: string;
        download: string;
        upload: string;
        export: string;
        import: string;
        settings: string;
        profile: string;
        logout: string;
        login: string;
        register: string;
    };
    // Navigation
    nav: {
        dashboard: string;
        profiles: string;
        history: string;
        analytics: string;
        settings: string;
        backup: string;
        audit: string;
    };
    // Dashboard
    dashboard: {
        title: string;
        welcome: string;
        activeProfiles: string;
        totalMessages: string;
        todayMessages: string;
        storageUsed: string;
        quickActions: string;
        recentActivity: string;
        noProfiles: string;
        createFirstProfile: string;
    };
    // Profiles
    profiles: {
        title: string;
        newProfile: string;
        editProfile: string;
        deleteProfile: string;
        profileName: string;
        phoneNumber: string;
        status: string;
        connected: string;
        disconnected: string;
        connecting: string;
        lastActive: string;
        actions: string;
        startSession: string;
        stopSession: string;
        viewHistory: string;
        runBackup: string;
        scanQRCode: string;
        confirmDelete: string;
        deleteWarning: string;
    };
    // History
    history: {
        title: string;
        searchMessages: string;
        filters: string;
        advancedFilters: string;
        dateRange: string;
        from: string;
        to: string;
        sender: string;
        sentByMe: string;
        receivedOnly: string;
        hasMedia: string;
        mediaType: string;
        image: string;
        video: string;
        audio: string;
        document: string;
        noResults: string;
        loadMore: string;
        exportResults: string;
    };
    // Backup
    backup: {
        title: string;
        runBackup: string;
        lastBackup: string;
        backupInProgress: string;
        backupComplete: string;
        backupFailed: string;
        messagesBackedUp: string;
        chatsBackedUp: string;
        mediaDownloaded: string;
        autoBackup: string;
        scheduleBackup: string;
    };
    // Settings
    settings: {
        title: string;
        account: string;
        security: string;
        notifications: string;
        language: string;
        theme: string;
        darkMode: string;
        lightMode: string;
        systemDefault: string;
        changePassword: string;
        twoFactorAuth: string;
        enable2FA: string;
        disable2FA: string;
        backupCodes: string;
        subscription: string;
        currentPlan: string;
        upgradePlan: string;
    };
    // Auth
    auth: {
        signIn: string;
        signUp: string;
        signOut: string;
        email: string;
        password: string;
        confirmPassword: string;
        forgotPassword: string;
        resetPassword: string;
        rememberMe: string;
        noAccount: string;
        haveAccount: string;
        invalidCredentials: string;
        passwordMismatch: string;
        emailRequired: string;
        passwordRequired: string;
    };
    // Errors
    errors: {
        generic: string;
        networkError: string;
        unauthorized: string;
        forbidden: string;
        notFound: string;
        rateLimited: string;
        serverError: string;
        validationError: string;
        sessionExpired: string;
        tryAgain: string;
    };
    // Mobile Warning
    mobileWarning: {
        title: string;
        message: string;
        whyDesktop: string;
        feature1: string;
        feature2: string;
        feature3: string;
        feature4: string;
        continueAnyway: string;
        dontShowAgain: string;
    };
}

// English translations
const en: Translations = {
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        update: 'Update',
        search: 'Search',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Info',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        close: 'Close',
        open: 'Open',
        yes: 'Yes',
        no: 'No',
        all: 'All',
        none: 'None',
        select: 'Select',
        filter: 'Filter',
        clear: 'Clear',
        refresh: 'Refresh',
        download: 'Download',
        upload: 'Upload',
        export: 'Export',
        import: 'Import',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
        login: 'Login',
        register: 'Register',
    },
    nav: {
        dashboard: 'Dashboard',
        profiles: 'Profiles',
        history: 'History',
        analytics: 'Analytics',
        settings: 'Settings',
        backup: 'Backup',
        audit: 'Audit Log',
    },
    dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome back',
        activeProfiles: 'Active Profiles',
        totalMessages: 'Total Messages',
        todayMessages: "Today's Messages",
        storageUsed: 'Storage Used',
        quickActions: 'Quick Actions',
        recentActivity: 'Recent Activity',
        noProfiles: 'No profiles yet',
        createFirstProfile: 'Create your first profile to get started',
    },
    profiles: {
        title: 'Profiles',
        newProfile: 'New Profile',
        editProfile: 'Edit Profile',
        deleteProfile: 'Delete Profile',
        profileName: 'Profile Name',
        phoneNumber: 'Phone Number',
        status: 'Status',
        connected: 'Connected',
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        lastActive: 'Last Active',
        actions: 'Actions',
        startSession: 'Start Session',
        stopSession: 'Stop Session',
        viewHistory: 'View History',
        runBackup: 'Run Backup',
        scanQRCode: 'Scan QR Code',
        confirmDelete: 'Are you sure you want to delete this profile?',
        deleteWarning: 'This action cannot be undone. All data will be permanently deleted.',
    },
    history: {
        title: 'Message History',
        searchMessages: 'Search messages...',
        filters: 'Filters',
        advancedFilters: 'Advanced Filters',
        dateRange: 'Date Range',
        from: 'From',
        to: 'To',
        sender: 'Sender',
        sentByMe: 'Sent by me',
        receivedOnly: 'Received only',
        hasMedia: 'Has Media',
        mediaType: 'Media Type',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        document: 'Document',
        noResults: 'No messages found',
        loadMore: 'Load More',
        exportResults: 'Export Results',
    },
    backup: {
        title: 'Backup',
        runBackup: 'Run Backup Now',
        lastBackup: 'Last Backup',
        backupInProgress: 'Backup in progress...',
        backupComplete: 'Backup complete',
        backupFailed: 'Backup failed',
        messagesBackedUp: 'messages backed up',
        chatsBackedUp: 'chats backed up',
        mediaDownloaded: 'media files downloaded',
        autoBackup: 'Auto Backup',
        scheduleBackup: 'Schedule Backup',
    },
    settings: {
        title: 'Settings',
        account: 'Account',
        security: 'Security',
        notifications: 'Notifications',
        language: 'Language',
        theme: 'Theme',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        systemDefault: 'System Default',
        changePassword: 'Change Password',
        twoFactorAuth: 'Two-Factor Authentication',
        enable2FA: 'Enable 2FA',
        disable2FA: 'Disable 2FA',
        backupCodes: 'Backup Codes',
        subscription: 'Subscription',
        currentPlan: 'Current Plan',
        upgradePlan: 'Upgrade Plan',
    },
    auth: {
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        rememberMe: 'Remember Me',
        noAccount: "Don't have an account?",
        haveAccount: 'Already have an account?',
        invalidCredentials: 'Invalid email or password',
        passwordMismatch: 'Passwords do not match',
        emailRequired: 'Email is required',
        passwordRequired: 'Password is required',
    },
    errors: {
        generic: 'Something went wrong',
        networkError: 'Network error. Please check your connection.',
        unauthorized: 'You are not authorized',
        forbidden: 'Access forbidden',
        notFound: 'Not found',
        rateLimited: 'Too many requests. Please wait.',
        serverError: 'Server error. Please try again later.',
        validationError: 'Please check your input',
        sessionExpired: 'Your session has expired',
        tryAgain: 'Try Again',
    },
    mobileWarning: {
        title: 'Desktop Required',
        message: 'WhatsApp Web Multi-User Manager is designed for desktop browsers. For the best experience, please access this application from a laptop or desktop computer.',
        whyDesktop: 'Why desktop is recommended:',
        feature1: 'WhatsApp Web QR code scanning',
        feature2: 'Multi-session management',
        feature3: 'Message search and history',
        feature4: 'Backup and restore features',
        continueAnyway: 'Continue Anyway',
        dontShowAgain: "Don't show this again",
    },
};

// Portuguese translations
const pt: Translations = {
    common: {
        save: 'Salvar',
        cancel: 'Cancelar',
        delete: 'Excluir',
        edit: 'Editar',
        create: 'Criar',
        update: 'Atualizar',
        search: 'Buscar',
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        warning: 'Aviso',
        info: 'Info',
        confirm: 'Confirmar',
        back: 'Voltar',
        next: 'Proximo',
        previous: 'Anterior',
        close: 'Fechar',
        open: 'Abrir',
        yes: 'Sim',
        no: 'Nao',
        all: 'Todos',
        none: 'Nenhum',
        select: 'Selecionar',
        filter: 'Filtrar',
        clear: 'Limpar',
        refresh: 'Atualizar',
        download: 'Baixar',
        upload: 'Enviar',
        export: 'Exportar',
        import: 'Importar',
        settings: 'Configuracoes',
        profile: 'Perfil',
        logout: 'Sair',
        login: 'Entrar',
        register: 'Cadastrar',
    },
    nav: {
        dashboard: 'Painel',
        profiles: 'Perfis',
        history: 'Historico',
        analytics: 'Analiticos',
        settings: 'Configuracoes',
        backup: 'Backup',
        audit: 'Log de Auditoria',
    },
    dashboard: {
        title: 'Painel',
        welcome: 'Bem-vindo de volta',
        activeProfiles: 'Perfis Ativos',
        totalMessages: 'Total de Mensagens',
        todayMessages: 'Mensagens de Hoje',
        storageUsed: 'Armazenamento Usado',
        quickActions: 'Acoes Rapidas',
        recentActivity: 'Atividade Recente',
        noProfiles: 'Nenhum perfil ainda',
        createFirstProfile: 'Crie seu primeiro perfil para comecar',
    },
    profiles: {
        title: 'Perfis',
        newProfile: 'Novo Perfil',
        editProfile: 'Editar Perfil',
        deleteProfile: 'Excluir Perfil',
        profileName: 'Nome do Perfil',
        phoneNumber: 'Numero de Telefone',
        status: 'Status',
        connected: 'Conectado',
        disconnected: 'Desconectado',
        connecting: 'Conectando...',
        lastActive: 'Ultima Atividade',
        actions: 'Acoes',
        startSession: 'Iniciar Sessao',
        stopSession: 'Parar Sessao',
        viewHistory: 'Ver Historico',
        runBackup: 'Executar Backup',
        scanQRCode: 'Escanear QR Code',
        confirmDelete: 'Tem certeza que deseja excluir este perfil?',
        deleteWarning: 'Esta acao nao pode ser desfeita. Todos os dados serao excluidos permanentemente.',
    },
    history: {
        title: 'Historico de Mensagens',
        searchMessages: 'Buscar mensagens...',
        filters: 'Filtros',
        advancedFilters: 'Filtros Avancados',
        dateRange: 'Periodo',
        from: 'De',
        to: 'Ate',
        sender: 'Remetente',
        sentByMe: 'Enviadas por mim',
        receivedOnly: 'Apenas recebidas',
        hasMedia: 'Com Midia',
        mediaType: 'Tipo de Midia',
        image: 'Imagem',
        video: 'Video',
        audio: 'Audio',
        document: 'Documento',
        noResults: 'Nenhuma mensagem encontrada',
        loadMore: 'Carregar Mais',
        exportResults: 'Exportar Resultados',
    },
    backup: {
        title: 'Backup',
        runBackup: 'Executar Backup Agora',
        lastBackup: 'Ultimo Backup',
        backupInProgress: 'Backup em andamento...',
        backupComplete: 'Backup concluido',
        backupFailed: 'Backup falhou',
        messagesBackedUp: 'mensagens salvas',
        chatsBackedUp: 'conversas salvas',
        mediaDownloaded: 'arquivos de midia baixados',
        autoBackup: 'Backup Automatico',
        scheduleBackup: 'Agendar Backup',
    },
    settings: {
        title: 'Configuracoes',
        account: 'Conta',
        security: 'Seguranca',
        notifications: 'Notificacoes',
        language: 'Idioma',
        theme: 'Tema',
        darkMode: 'Modo Escuro',
        lightMode: 'Modo Claro',
        systemDefault: 'Padrao do Sistema',
        changePassword: 'Alterar Senha',
        twoFactorAuth: 'Autenticacao de Dois Fatores',
        enable2FA: 'Ativar 2FA',
        disable2FA: 'Desativar 2FA',
        backupCodes: 'Codigos de Backup',
        subscription: 'Assinatura',
        currentPlan: 'Plano Atual',
        upgradePlan: 'Atualizar Plano',
    },
    auth: {
        signIn: 'Entrar',
        signUp: 'Cadastrar',
        signOut: 'Sair',
        email: 'Email',
        password: 'Senha',
        confirmPassword: 'Confirmar Senha',
        forgotPassword: 'Esqueceu a Senha?',
        resetPassword: 'Redefinir Senha',
        rememberMe: 'Lembrar-me',
        noAccount: 'Nao tem uma conta?',
        haveAccount: 'Ja tem uma conta?',
        invalidCredentials: 'Email ou senha invalidos',
        passwordMismatch: 'As senhas nao coincidem',
        emailRequired: 'Email e obrigatorio',
        passwordRequired: 'Senha e obrigatoria',
    },
    errors: {
        generic: 'Algo deu errado',
        networkError: 'Erro de rede. Verifique sua conexao.',
        unauthorized: 'Voce nao esta autorizado',
        forbidden: 'Acesso proibido',
        notFound: 'Nao encontrado',
        rateLimited: 'Muitas requisicoes. Aguarde.',
        serverError: 'Erro no servidor. Tente novamente mais tarde.',
        validationError: 'Verifique seus dados',
        sessionExpired: 'Sua sessao expirou',
        tryAgain: 'Tentar Novamente',
    },
    mobileWarning: {
        title: 'Desktop Necessario',
        message: 'O WhatsApp Web Multi-User Manager foi projetado para navegadores desktop. Para a melhor experiencia, acesse este aplicativo de um laptop ou computador desktop.',
        whyDesktop: 'Por que desktop e recomendado:',
        feature1: 'Escaneamento de QR Code do WhatsApp Web',
        feature2: 'Gerenciamento de multiplas sessoes',
        feature3: 'Busca e historico de mensagens',
        feature4: 'Recursos de backup e restauracao',
        continueAnyway: 'Continuar Mesmo Assim',
        dontShowAgain: 'Nao mostrar novamente',
    },
};

// Spanish translations
const es: Translations = {
    common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        update: 'Actualizar',
        search: 'Buscar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Exito',
        warning: 'Advertencia',
        info: 'Info',
        confirm: 'Confirmar',
        back: 'Volver',
        next: 'Siguiente',
        previous: 'Anterior',
        close: 'Cerrar',
        open: 'Abrir',
        yes: 'Si',
        no: 'No',
        all: 'Todos',
        none: 'Ninguno',
        select: 'Seleccionar',
        filter: 'Filtrar',
        clear: 'Limpiar',
        refresh: 'Actualizar',
        download: 'Descargar',
        upload: 'Subir',
        export: 'Exportar',
        import: 'Importar',
        settings: 'Configuracion',
        profile: 'Perfil',
        logout: 'Cerrar Sesion',
        login: 'Iniciar Sesion',
        register: 'Registrarse',
    },
    nav: {
        dashboard: 'Panel',
        profiles: 'Perfiles',
        history: 'Historial',
        analytics: 'Analiticas',
        settings: 'Configuracion',
        backup: 'Respaldo',
        audit: 'Registro de Auditoria',
    },
    dashboard: {
        title: 'Panel',
        welcome: 'Bienvenido de nuevo',
        activeProfiles: 'Perfiles Activos',
        totalMessages: 'Total de Mensajes',
        todayMessages: 'Mensajes de Hoy',
        storageUsed: 'Almacenamiento Usado',
        quickActions: 'Acciones Rapidas',
        recentActivity: 'Actividad Reciente',
        noProfiles: 'Sin perfiles aun',
        createFirstProfile: 'Crea tu primer perfil para comenzar',
    },
    profiles: {
        title: 'Perfiles',
        newProfile: 'Nuevo Perfil',
        editProfile: 'Editar Perfil',
        deleteProfile: 'Eliminar Perfil',
        profileName: 'Nombre del Perfil',
        phoneNumber: 'Numero de Telefono',
        status: 'Estado',
        connected: 'Conectado',
        disconnected: 'Desconectado',
        connecting: 'Conectando...',
        lastActive: 'Ultima Actividad',
        actions: 'Acciones',
        startSession: 'Iniciar Sesion',
        stopSession: 'Detener Sesion',
        viewHistory: 'Ver Historial',
        runBackup: 'Ejecutar Respaldo',
        scanQRCode: 'Escanear Codigo QR',
        confirmDelete: 'Estas seguro de que deseas eliminar este perfil?',
        deleteWarning: 'Esta accion no se puede deshacer. Todos los datos se eliminaran permanentemente.',
    },
    history: {
        title: 'Historial de Mensajes',
        searchMessages: 'Buscar mensajes...',
        filters: 'Filtros',
        advancedFilters: 'Filtros Avanzados',
        dateRange: 'Rango de Fechas',
        from: 'Desde',
        to: 'Hasta',
        sender: 'Remitente',
        sentByMe: 'Enviados por mi',
        receivedOnly: 'Solo recibidos',
        hasMedia: 'Con Multimedia',
        mediaType: 'Tipo de Multimedia',
        image: 'Imagen',
        video: 'Video',
        audio: 'Audio',
        document: 'Documento',
        noResults: 'No se encontraron mensajes',
        loadMore: 'Cargar Mas',
        exportResults: 'Exportar Resultados',
    },
    backup: {
        title: 'Respaldo',
        runBackup: 'Ejecutar Respaldo Ahora',
        lastBackup: 'Ultimo Respaldo',
        backupInProgress: 'Respaldo en progreso...',
        backupComplete: 'Respaldo completado',
        backupFailed: 'Respaldo fallido',
        messagesBackedUp: 'mensajes respaldados',
        chatsBackedUp: 'chats respaldados',
        mediaDownloaded: 'archivos multimedia descargados',
        autoBackup: 'Respaldo Automatico',
        scheduleBackup: 'Programar Respaldo',
    },
    settings: {
        title: 'Configuracion',
        account: 'Cuenta',
        security: 'Seguridad',
        notifications: 'Notificaciones',
        language: 'Idioma',
        theme: 'Tema',
        darkMode: 'Modo Oscuro',
        lightMode: 'Modo Claro',
        systemDefault: 'Predeterminado del Sistema',
        changePassword: 'Cambiar Contrasena',
        twoFactorAuth: 'Autenticacion de Dos Factores',
        enable2FA: 'Activar 2FA',
        disable2FA: 'Desactivar 2FA',
        backupCodes: 'Codigos de Respaldo',
        subscription: 'Suscripcion',
        currentPlan: 'Plan Actual',
        upgradePlan: 'Actualizar Plan',
    },
    auth: {
        signIn: 'Iniciar Sesion',
        signUp: 'Registrarse',
        signOut: 'Cerrar Sesion',
        email: 'Correo Electronico',
        password: 'Contrasena',
        confirmPassword: 'Confirmar Contrasena',
        forgotPassword: 'Olvidaste tu Contrasena?',
        resetPassword: 'Restablecer Contrasena',
        rememberMe: 'Recordarme',
        noAccount: 'No tienes una cuenta?',
        haveAccount: 'Ya tienes una cuenta?',
        invalidCredentials: 'Correo o contrasena invalidos',
        passwordMismatch: 'Las contrasenas no coinciden',
        emailRequired: 'El correo es obligatorio',
        passwordRequired: 'La contrasena es obligatoria',
    },
    errors: {
        generic: 'Algo salio mal',
        networkError: 'Error de red. Verifica tu conexion.',
        unauthorized: 'No estas autorizado',
        forbidden: 'Acceso prohibido',
        notFound: 'No encontrado',
        rateLimited: 'Demasiadas solicitudes. Espera un momento.',
        serverError: 'Error del servidor. Intenta mas tarde.',
        validationError: 'Verifica tus datos',
        sessionExpired: 'Tu sesion ha expirado',
        tryAgain: 'Intentar de Nuevo',
    },
    mobileWarning: {
        title: 'Se Requiere Escritorio',
        message: 'WhatsApp Web Multi-User Manager esta disenado para navegadores de escritorio. Para la mejor experiencia, accede desde una laptop o computadora de escritorio.',
        whyDesktop: 'Por que se recomienda escritorio:',
        feature1: 'Escaneo de codigo QR de WhatsApp Web',
        feature2: 'Gestion de multiples sesiones',
        feature3: 'Busqueda e historial de mensajes',
        feature4: 'Funciones de respaldo y restauracion',
        continueAnyway: 'Continuar de Todos Modos',
        dontShowAgain: 'No mostrar de nuevo',
    },
};

// French translations
const fr: Translations = {
    common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        create: 'Creer',
        update: 'Mettre a jour',
        search: 'Rechercher',
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succes',
        warning: 'Avertissement',
        info: 'Info',
        confirm: 'Confirmer',
        back: 'Retour',
        next: 'Suivant',
        previous: 'Precedent',
        close: 'Fermer',
        open: 'Ouvrir',
        yes: 'Oui',
        no: 'Non',
        all: 'Tous',
        none: 'Aucun',
        select: 'Selectionner',
        filter: 'Filtrer',
        clear: 'Effacer',
        refresh: 'Actualiser',
        download: 'Telecharger',
        upload: 'Envoyer',
        export: 'Exporter',
        import: 'Importer',
        settings: 'Parametres',
        profile: 'Profil',
        logout: 'Deconnexion',
        login: 'Connexion',
        register: "S'inscrire",
    },
    nav: {
        dashboard: 'Tableau de Bord',
        profiles: 'Profils',
        history: 'Historique',
        analytics: 'Analyses',
        settings: 'Parametres',
        backup: 'Sauvegarde',
        audit: "Journal d'Audit",
    },
    dashboard: {
        title: 'Tableau de Bord',
        welcome: 'Bienvenue',
        activeProfiles: 'Profils Actifs',
        totalMessages: 'Total des Messages',
        todayMessages: "Messages d'Aujourd'hui",
        storageUsed: 'Stockage Utilise',
        quickActions: 'Actions Rapides',
        recentActivity: 'Activite Recente',
        noProfiles: 'Pas encore de profils',
        createFirstProfile: 'Creez votre premier profil pour commencer',
    },
    profiles: {
        title: 'Profils',
        newProfile: 'Nouveau Profil',
        editProfile: 'Modifier le Profil',
        deleteProfile: 'Supprimer le Profil',
        profileName: 'Nom du Profil',
        phoneNumber: 'Numero de Telephone',
        status: 'Statut',
        connected: 'Connecte',
        disconnected: 'Deconnecte',
        connecting: 'Connexion...',
        lastActive: 'Derniere Activite',
        actions: 'Actions',
        startSession: 'Demarrer la Session',
        stopSession: 'Arreter la Session',
        viewHistory: "Voir l'Historique",
        runBackup: 'Executer la Sauvegarde',
        scanQRCode: 'Scanner le QR Code',
        confirmDelete: 'Etes-vous sur de vouloir supprimer ce profil?',
        deleteWarning: 'Cette action est irreversible. Toutes les donnees seront definitivement supprimees.',
    },
    history: {
        title: 'Historique des Messages',
        searchMessages: 'Rechercher des messages...',
        filters: 'Filtres',
        advancedFilters: 'Filtres Avances',
        dateRange: 'Plage de Dates',
        from: 'Du',
        to: 'Au',
        sender: 'Expediteur',
        sentByMe: 'Envoyes par moi',
        receivedOnly: 'Recus uniquement',
        hasMedia: 'Avec Media',
        mediaType: 'Type de Media',
        image: 'Image',
        video: 'Video',
        audio: 'Audio',
        document: 'Document',
        noResults: 'Aucun message trouve',
        loadMore: 'Charger Plus',
        exportResults: 'Exporter les Resultats',
    },
    backup: {
        title: 'Sauvegarde',
        runBackup: 'Executer la Sauvegarde',
        lastBackup: 'Derniere Sauvegarde',
        backupInProgress: 'Sauvegarde en cours...',
        backupComplete: 'Sauvegarde terminee',
        backupFailed: 'Sauvegarde echouee',
        messagesBackedUp: 'messages sauvegardes',
        chatsBackedUp: 'discussions sauvegardees',
        mediaDownloaded: 'fichiers media telecharges',
        autoBackup: 'Sauvegarde Automatique',
        scheduleBackup: 'Planifier la Sauvegarde',
    },
    settings: {
        title: 'Parametres',
        account: 'Compte',
        security: 'Securite',
        notifications: 'Notifications',
        language: 'Langue',
        theme: 'Theme',
        darkMode: 'Mode Sombre',
        lightMode: 'Mode Clair',
        systemDefault: 'Par Defaut du Systeme',
        changePassword: 'Changer le Mot de Passe',
        twoFactorAuth: 'Authentification a Deux Facteurs',
        enable2FA: 'Activer 2FA',
        disable2FA: 'Desactiver 2FA',
        backupCodes: 'Codes de Secours',
        subscription: 'Abonnement',
        currentPlan: 'Plan Actuel',
        upgradePlan: 'Mettre a Niveau',
    },
    auth: {
        signIn: 'Se Connecter',
        signUp: "S'inscrire",
        signOut: 'Se Deconnecter',
        email: 'Email',
        password: 'Mot de Passe',
        confirmPassword: 'Confirmer le Mot de Passe',
        forgotPassword: 'Mot de Passe Oublie?',
        resetPassword: 'Reinitialiser le Mot de Passe',
        rememberMe: 'Se Souvenir de Moi',
        noAccount: "Vous n'avez pas de compte?",
        haveAccount: 'Vous avez deja un compte?',
        invalidCredentials: 'Email ou mot de passe invalide',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
        emailRequired: "L'email est requis",
        passwordRequired: 'Le mot de passe est requis',
    },
    errors: {
        generic: "Une erreur s'est produite",
        networkError: 'Erreur reseau. Verifiez votre connexion.',
        unauthorized: "Vous n'etes pas autorise",
        forbidden: 'Acces interdit',
        notFound: 'Non trouve',
        rateLimited: 'Trop de requetes. Veuillez patienter.',
        serverError: 'Erreur serveur. Reessayez plus tard.',
        validationError: 'Verifiez vos donnees',
        sessionExpired: 'Votre session a expire',
        tryAgain: 'Reessayer',
    },
    mobileWarning: {
        title: 'Bureau Requis',
        message: "WhatsApp Web Multi-User Manager est concu pour les navigateurs de bureau. Pour une meilleure experience, accedez a cette application depuis un ordinateur portable ou de bureau.",
        whyDesktop: 'Pourquoi le bureau est recommande:',
        feature1: 'Scan du QR code WhatsApp Web',
        feature2: 'Gestion de sessions multiples',
        feature3: 'Recherche et historique des messages',
        feature4: 'Fonctions de sauvegarde et restauration',
        continueAnyway: 'Continuer Quand Meme',
        dontShowAgain: 'Ne plus afficher',
    },
};

// German translations
const de: Translations = {
    common: {
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Loschen',
        edit: 'Bearbeiten',
        create: 'Erstellen',
        update: 'Aktualisieren',
        search: 'Suchen',
        loading: 'Laden...',
        error: 'Fehler',
        success: 'Erfolg',
        warning: 'Warnung',
        info: 'Info',
        confirm: 'Bestatigen',
        back: 'Zuruck',
        next: 'Weiter',
        previous: 'Vorherige',
        close: 'Schliessen',
        open: 'Offnen',
        yes: 'Ja',
        no: 'Nein',
        all: 'Alle',
        none: 'Keine',
        select: 'Auswahlen',
        filter: 'Filtern',
        clear: 'Loschen',
        refresh: 'Aktualisieren',
        download: 'Herunterladen',
        upload: 'Hochladen',
        export: 'Exportieren',
        import: 'Importieren',
        settings: 'Einstellungen',
        profile: 'Profil',
        logout: 'Abmelden',
        login: 'Anmelden',
        register: 'Registrieren',
    },
    nav: {
        dashboard: 'Dashboard',
        profiles: 'Profile',
        history: 'Verlauf',
        analytics: 'Analysen',
        settings: 'Einstellungen',
        backup: 'Sicherung',
        audit: 'Prufprotokoll',
    },
    dashboard: {
        title: 'Dashboard',
        welcome: 'Willkommen zuruck',
        activeProfiles: 'Aktive Profile',
        totalMessages: 'Gesamtnachrichten',
        todayMessages: 'Heutige Nachrichten',
        storageUsed: 'Genutzter Speicher',
        quickActions: 'Schnellaktionen',
        recentActivity: 'Letzte Aktivitaten',
        noProfiles: 'Noch keine Profile',
        createFirstProfile: 'Erstellen Sie Ihr erstes Profil, um zu beginnen',
    },
    profiles: {
        title: 'Profile',
        newProfile: 'Neues Profil',
        editProfile: 'Profil Bearbeiten',
        deleteProfile: 'Profil Loschen',
        profileName: 'Profilname',
        phoneNumber: 'Telefonnummer',
        status: 'Status',
        connected: 'Verbunden',
        disconnected: 'Getrennt',
        connecting: 'Verbinden...',
        lastActive: 'Zuletzt Aktiv',
        actions: 'Aktionen',
        startSession: 'Sitzung Starten',
        stopSession: 'Sitzung Beenden',
        viewHistory: 'Verlauf Anzeigen',
        runBackup: 'Sicherung Ausfuhren',
        scanQRCode: 'QR-Code Scannen',
        confirmDelete: 'Sind Sie sicher, dass Sie dieses Profil loschen mochten?',
        deleteWarning: 'Diese Aktion kann nicht ruckgangig gemacht werden. Alle Daten werden dauerhaft geloscht.',
    },
    history: {
        title: 'Nachrichtenverlauf',
        searchMessages: 'Nachrichten suchen...',
        filters: 'Filter',
        advancedFilters: 'Erweiterte Filter',
        dateRange: 'Datumsbereich',
        from: 'Von',
        to: 'Bis',
        sender: 'Absender',
        sentByMe: 'Von mir gesendet',
        receivedOnly: 'Nur empfangen',
        hasMedia: 'Mit Medien',
        mediaType: 'Medientyp',
        image: 'Bild',
        video: 'Video',
        audio: 'Audio',
        document: 'Dokument',
        noResults: 'Keine Nachrichten gefunden',
        loadMore: 'Mehr Laden',
        exportResults: 'Ergebnisse Exportieren',
    },
    backup: {
        title: 'Sicherung',
        runBackup: 'Sicherung Jetzt Ausfuhren',
        lastBackup: 'Letzte Sicherung',
        backupInProgress: 'Sicherung lauft...',
        backupComplete: 'Sicherung abgeschlossen',
        backupFailed: 'Sicherung fehlgeschlagen',
        messagesBackedUp: 'Nachrichten gesichert',
        chatsBackedUp: 'Chats gesichert',
        mediaDownloaded: 'Mediendateien heruntergeladen',
        autoBackup: 'Automatische Sicherung',
        scheduleBackup: 'Sicherung Planen',
    },
    settings: {
        title: 'Einstellungen',
        account: 'Konto',
        security: 'Sicherheit',
        notifications: 'Benachrichtigungen',
        language: 'Sprache',
        theme: 'Design',
        darkMode: 'Dunkelmodus',
        lightMode: 'Hellmodus',
        systemDefault: 'Systemstandard',
        changePassword: 'Passwort Andern',
        twoFactorAuth: 'Zwei-Faktor-Authentifizierung',
        enable2FA: '2FA Aktivieren',
        disable2FA: '2FA Deaktivieren',
        backupCodes: 'Backup-Codes',
        subscription: 'Abonnement',
        currentPlan: 'Aktueller Plan',
        upgradePlan: 'Plan Upgraden',
    },
    auth: {
        signIn: 'Anmelden',
        signUp: 'Registrieren',
        signOut: 'Abmelden',
        email: 'E-Mail',
        password: 'Passwort',
        confirmPassword: 'Passwort Bestatigen',
        forgotPassword: 'Passwort Vergessen?',
        resetPassword: 'Passwort Zurucksetzen',
        rememberMe: 'Angemeldet Bleiben',
        noAccount: 'Haben Sie kein Konto?',
        haveAccount: 'Haben Sie bereits ein Konto?',
        invalidCredentials: 'Ungultige E-Mail oder Passwort',
        passwordMismatch: 'Passworter stimmen nicht uberein',
        emailRequired: 'E-Mail ist erforderlich',
        passwordRequired: 'Passwort ist erforderlich',
    },
    errors: {
        generic: 'Etwas ist schief gelaufen',
        networkError: 'Netzwerkfehler. Uberprufen Sie Ihre Verbindung.',
        unauthorized: 'Sie sind nicht autorisiert',
        forbidden: 'Zugriff verboten',
        notFound: 'Nicht gefunden',
        rateLimited: 'Zu viele Anfragen. Bitte warten.',
        serverError: 'Serverfehler. Versuchen Sie es spater erneut.',
        validationError: 'Bitte uberprufen Sie Ihre Eingaben',
        sessionExpired: 'Ihre Sitzung ist abgelaufen',
        tryAgain: 'Erneut Versuchen',
    },
    mobileWarning: {
        title: 'Desktop Erforderlich',
        message: 'WhatsApp Web Multi-User Manager ist fur Desktop-Browser konzipiert. Fur die beste Erfahrung greifen Sie bitte von einem Laptop oder Desktop-Computer aus zu.',
        whyDesktop: 'Warum Desktop empfohlen wird:',
        feature1: 'WhatsApp Web QR-Code-Scan',
        feature2: 'Multi-Sitzungs-Verwaltung',
        feature3: 'Nachrichtensuche und Verlauf',
        feature4: 'Sicherungs- und Wiederherstellungsfunktionen',
        continueAnyway: 'Trotzdem Fortfahren',
        dontShowAgain: 'Nicht mehr anzeigen',
    },
};

// All translations
const translations: Record<Locale, Translations> = {
    en,
    pt,
    es,
    fr,
    de,
};

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: Locale = 'en'): Translations {
    return translations[locale] || translations.en;
}

/**
 * Get a specific translation key
 */
export function t(locale: Locale, key: string): string {
    const parts = key.split('.');
    let result: unknown = translations[locale] || translations.en;

    for (const part of parts) {
        if (result && typeof result === 'object' && part in result) {
            result = (result as Record<string, unknown>)[part];
        } else {
            return key; // Return the key if translation not found
        }
    }

    return typeof result === 'string' ? result : key;
}

/**
 * Format a date according to locale
 */
export function formatDate(date: Date, locale: Locale): string {
    const localeMap: Record<Locale, string> = {
        en: 'en-US',
        pt: 'pt-BR',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
    };

    return date.toLocaleDateString(localeMap[locale], {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format a date and time according to locale
 */
export function formatDateTime(date: Date, locale: Locale): string {
    const localeMap: Record<Locale, string> = {
        en: 'en-US',
        pt: 'pt-BR',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
    };

    return date.toLocaleString(localeMap[locale], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format a number according to locale
 */
export function formatNumber(num: number, locale: Locale): string {
    const localeMap: Record<Locale, string> = {
        en: 'en-US',
        pt: 'pt-BR',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
    };

    return num.toLocaleString(localeMap[locale]);
}

export default translations;
