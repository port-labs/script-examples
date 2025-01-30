import { JQQuery } from '../types';

const isJQQuery = (input: unknown): input is JQQuery => {
	return typeof input === 'object' && input !== null && 'jqQuery' in input && typeof input.jqQuery === 'string';
};

export const findJQQueryPath = (obj: unknown, currentPath: string = ''): string | null => {
	if (typeof obj !== 'object' || obj === null) {
		return null;
	}

	if (isJQQuery(obj)) {
		return currentPath;
	}

	for (const [key, value] of Object.entries(obj)) {
		const newPath = currentPath ? `${currentPath}.${key}` : key;

		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				const result = findJQQueryPath(value[i], `${newPath}[${i}]`);
				if (result) return result;
			}
		} else if (typeof value === 'object' && value !== null) {
			const result = findJQQueryPath(value, newPath);
			if (result) return result;
		}
	}

	return null;
};
