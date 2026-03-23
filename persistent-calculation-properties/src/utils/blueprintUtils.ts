import { CalculationPropertyFinding } from '../types';

const NOW_PATTERN = /\bnow\b/;
const RELATION_TITLE_PATTERN = /\.relations\.[\w']+\.title/;
const RELATION_IDENTIFIER_PATTERN = /\.relations\.[\w']+\.identifier/;

export const findCalculationPropertiesWithBreakingChanges = (
	blueprints: any[],
): CalculationPropertyFinding[] => {
	const findings: CalculationPropertyFinding[] = [];

	for (const blueprint of blueprints) {
		const calculationProperties = blueprint.calculationProperties as Record<string, any> | undefined;
		if (!calculationProperties) continue;

		for (const [propId, calcProp] of Object.entries(calculationProperties)) {
			const calculation: string = calcProp.calculation ?? '';
			const reasons: string[] = [];

			if (NOW_PATTERN.test(calculation)) {
				reasons.push('Uses the "now" JQ function (relative date). Value will only be accurate to roughly an hour.');
			}

			if (RELATION_TITLE_PATTERN.test(calculation)) {
				reasons.push(
					'References .relations.<name>.title. Relations are plain identifiers in persistent mode; use a mirror property instead.',
				);
			}

			if (RELATION_IDENTIFIER_PATTERN.test(calculation)) {
				reasons.push(
					'References .relations.<name>.identifier. Relations are plain strings in persistent mode; access the identifier directly.',
				);
			}

			if (reasons.length > 0) {
				findings.push({
					blueprintIdentifier: blueprint.identifier,
					blueprintTitle: blueprint.title ?? '',
					propertyIdentifier: propId,
					calculation,
					reason: reasons.join('<br/>'),
				});
			}
		}
	}

	return findings;
};
