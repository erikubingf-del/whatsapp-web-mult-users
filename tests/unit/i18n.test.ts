import { describe, it, expect } from '@jest/globals';
import {
    getTranslations,
    t,
    formatDate,
    formatDateTime,
    formatNumber,
    SUPPORTED_LOCALES,
    LOCALE_NAMES,
    Locale,
} from '../../app/lib/i18n';

describe('i18n System', () => {
    describe('Supported Locales', () => {
        it('should support 5 languages', () => {
            expect(SUPPORTED_LOCALES).toHaveLength(5);
        });

        it('should include all required locales', () => {
            expect(SUPPORTED_LOCALES).toContain('en');
            expect(SUPPORTED_LOCALES).toContain('pt');
            expect(SUPPORTED_LOCALES).toContain('es');
            expect(SUPPORTED_LOCALES).toContain('fr');
            expect(SUPPORTED_LOCALES).toContain('de');
        });

        it('should have names for all locales', () => {
            SUPPORTED_LOCALES.forEach(locale => {
                expect(LOCALE_NAMES[locale]).toBeDefined();
                expect(LOCALE_NAMES[locale].length).toBeGreaterThan(0);
            });
        });
    });

    describe('getTranslations', () => {
        it('should return English translations by default', () => {
            const translations = getTranslations();
            expect(translations.common.save).toBe('Save');
        });

        it('should return translations for each supported locale', () => {
            SUPPORTED_LOCALES.forEach(locale => {
                const translations = getTranslations(locale);
                expect(translations).toBeDefined();
                expect(translations.common).toBeDefined();
                expect(translations.nav).toBeDefined();
            });
        });

        it('should fallback to English for unknown locale', () => {
            const translations = getTranslations('xx' as Locale);
            expect(translations.common.save).toBe('Save');
        });
    });

    describe('Translation Keys', () => {
        describe('Common Translations', () => {
            it('should have all common keys in English', () => {
                const en = getTranslations('en');
                expect(en.common.save).toBe('Save');
                expect(en.common.cancel).toBe('Cancel');
                expect(en.common.delete).toBe('Delete');
                expect(en.common.search).toBe('Search');
                expect(en.common.loading).toBe('Loading...');
            });

            it('should have all common keys in Portuguese', () => {
                const pt = getTranslations('pt');
                expect(pt.common.save).toBe('Salvar');
                expect(pt.common.cancel).toBe('Cancelar');
                expect(pt.common.delete).toBe('Excluir');
                expect(pt.common.search).toBe('Buscar');
            });

            it('should have all common keys in Spanish', () => {
                const es = getTranslations('es');
                expect(es.common.save).toBe('Guardar');
                expect(es.common.cancel).toBe('Cancelar');
                expect(es.common.delete).toBe('Eliminar');
                expect(es.common.search).toBe('Buscar');
            });

            it('should have all common keys in French', () => {
                const fr = getTranslations('fr');
                expect(fr.common.save).toBe('Enregistrer');
                expect(fr.common.cancel).toBe('Annuler');
                expect(fr.common.delete).toBe('Supprimer');
                expect(fr.common.search).toBe('Rechercher');
            });

            it('should have all common keys in German', () => {
                const de = getTranslations('de');
                expect(de.common.save).toBe('Speichern');
                expect(de.common.cancel).toBe('Abbrechen');
                expect(de.common.delete).toBe('Loschen');
                expect(de.common.search).toBe('Suchen');
            });
        });

        describe('Navigation Translations', () => {
            it('should have navigation keys for all locales', () => {
                SUPPORTED_LOCALES.forEach(locale => {
                    const translations = getTranslations(locale);
                    expect(translations.nav.dashboard).toBeDefined();
                    expect(translations.nav.profiles).toBeDefined();
                    expect(translations.nav.history).toBeDefined();
                    expect(translations.nav.settings).toBeDefined();
                });
            });
        });

        describe('Auth Translations', () => {
            it('should have auth keys for all locales', () => {
                SUPPORTED_LOCALES.forEach(locale => {
                    const translations = getTranslations(locale);
                    expect(translations.auth.signIn).toBeDefined();
                    expect(translations.auth.signUp).toBeDefined();
                    expect(translations.auth.email).toBeDefined();
                    expect(translations.auth.password).toBeDefined();
                });
            });
        });

        describe('Error Translations', () => {
            it('should have error keys for all locales', () => {
                SUPPORTED_LOCALES.forEach(locale => {
                    const translations = getTranslations(locale);
                    expect(translations.errors.generic).toBeDefined();
                    expect(translations.errors.networkError).toBeDefined();
                    expect(translations.errors.unauthorized).toBeDefined();
                    expect(translations.errors.rateLimited).toBeDefined();
                });
            });
        });

        describe('Mobile Warning Translations', () => {
            it('should have mobile warning keys for all locales', () => {
                SUPPORTED_LOCALES.forEach(locale => {
                    const translations = getTranslations(locale);
                    expect(translations.mobileWarning.title).toBeDefined();
                    expect(translations.mobileWarning.message).toBeDefined();
                    expect(translations.mobileWarning.continueAnyway).toBeDefined();
                });
            });
        });
    });

    describe('t() function', () => {
        it('should get nested translation keys', () => {
            expect(t('en', 'common.save')).toBe('Save');
            expect(t('pt', 'common.save')).toBe('Salvar');
            expect(t('es', 'common.save')).toBe('Guardar');
        });

        it('should return key if translation not found', () => {
            expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
        });

        it('should handle deeply nested keys', () => {
            expect(t('en', 'mobileWarning.title')).toBe('Desktop Required');
        });
    });

    describe('Date Formatting', () => {
        const testDate = new Date('2024-06-15T10:30:00Z');

        it('should format date in English', () => {
            const formatted = formatDate(testDate, 'en');
            expect(formatted).toContain('2024');
            // Should contain month or day
            expect(formatted.includes('June') || formatted.includes('15')).toBe(true);
        });

        it('should format date in Portuguese', () => {
            const formatted = formatDate(testDate, 'pt');
            expect(formatted).toContain('2024');
        });

        it('should format date in Spanish', () => {
            const formatted = formatDate(testDate, 'es');
            expect(formatted).toContain('2024');
        });

        it('should format date in French', () => {
            const formatted = formatDate(testDate, 'fr');
            expect(formatted).toContain('2024');
        });

        it('should format date in German', () => {
            const formatted = formatDate(testDate, 'de');
            expect(formatted).toContain('2024');
        });
    });

    describe('DateTime Formatting', () => {
        const testDate = new Date('2024-06-15T10:30:00Z');

        it('should include time in formatted output', () => {
            SUPPORTED_LOCALES.forEach(locale => {
                const formatted = formatDateTime(testDate, locale);
                expect(formatted.length).toBeGreaterThan(0);
                // Should contain year
                expect(formatted).toContain('2024');
            });
        });
    });

    describe('Number Formatting', () => {
        it('should format numbers with locale-specific separators', () => {
            const number = 1234567.89;

            const enFormatted = formatNumber(number, 'en');
            expect(enFormatted).toContain('1');

            const deFormatted = formatNumber(number, 'de');
            expect(deFormatted).toContain('1');
        });

        it('should handle integers', () => {
            const number = 1000000;

            SUPPORTED_LOCALES.forEach(locale => {
                const formatted = formatNumber(number, locale);
                expect(formatted.length).toBeGreaterThan(0);
            });
        });

        it('should handle zero', () => {
            SUPPORTED_LOCALES.forEach(locale => {
                const formatted = formatNumber(0, locale);
                expect(formatted).toBe('0');
            });
        });
    });

    describe('Translation Completeness', () => {
        it('should have same structure for all locales', () => {
            const enKeys = Object.keys(getTranslations('en'));

            SUPPORTED_LOCALES.forEach(locale => {
                const localeKeys = Object.keys(getTranslations(locale));
                expect(localeKeys).toEqual(enKeys);
            });
        });

        it('should have non-empty values for all translations', () => {
            SUPPORTED_LOCALES.forEach(locale => {
                const translations = getTranslations(locale);

                // Check common section
                Object.values(translations.common).forEach(value => {
                    expect(value.length).toBeGreaterThan(0);
                });

                // Check nav section
                Object.values(translations.nav).forEach(value => {
                    expect(value.length).toBeGreaterThan(0);
                });

                // Check auth section
                Object.values(translations.auth).forEach(value => {
                    expect(value.length).toBeGreaterThan(0);
                });
            });
        });
    });
});
