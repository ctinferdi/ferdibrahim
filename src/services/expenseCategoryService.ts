import { projectService } from './projectService';

export type ExpenseCategoryStorage = 'shared' | 'local' | 'memory';

const STORAGE_PREFIX = 'project_expense_categories_v1_';

export const normalizeExpenseCategory = (value: string): string =>
    value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');

const normalizeList = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    return values
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeExpenseCategory)
        .filter(value => {
            if (!value) return false;
            const key = value.toLocaleLowerCase('tr-TR');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
};

export const expenseCategoryService = {
    getLocal(projectId: string): string[] {
        try {
            const value = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
            return value ? normalizeList(JSON.parse(value)) : [];
        } catch {
            return [];
        }
    },

    getProjectCategories(projectId: string, projectCategories?: string[]): string[] {
        const localCategories = this.getLocal(projectId);
        const remoteCategories = normalizeList(projectCategories);

        // Prefer the shared project list when populated. If it is empty or the
        // database column is not installed yet, keep this browser's saved list.
        const categories = remoteCategories.length > 0 ? remoteCategories : localCategories;
        this.saveLocal(projectId, categories);
        return categories;
    },

    saveLocal(projectId: string, categories: string[]): boolean {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(normalizeList(categories)));
            return true;
        } catch {
            return false;
        }
    },

    async saveProjectCategories(projectId: string, categories: string[]): Promise<ExpenseCategoryStorage> {
        const normalized = normalizeList(categories);
        const localSaved = this.saveLocal(projectId, normalized);

        try {
            await projectService.updateProject(projectId, { expense_categories: normalized });
            return 'shared';
        } catch {
            return localSaved ? 'local' : 'memory';
        }
    }
};
