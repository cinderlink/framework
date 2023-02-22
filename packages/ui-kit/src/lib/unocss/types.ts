export type FlexAlign =
	| 'items-start'
	| 'items-end'
	| 'items-center'
	| 'items-baseline'
	| 'items-stretch';

export type FlexJustify =
	| 'justify-start'
	| 'justify-end'
	| 'justify-center'
	| 'justify-between'
	| 'justify-around'
	| 'justify-evenly';

export type Color =
	| 'slate'
	| 'gray'
	| 'zinc'
	| 'neutral'
	| 'stone'
	| 'red'
	| 'orange'
	| 'yellow'
	| 'lime'
	| 'green'
	| 'emerald'
	| 'teal'
	| 'cyan'
	| 'sky'
	| 'blue'
	| 'indigo'
	| 'violet'
	| 'purple'
	| 'fuchsia'
	| 'pink'
	| 'rose'
	| 'white'
	| 'black'
	| 'transparent';

export enum ColorsEnum {
	'slate' = 'slate',
	'gray' = 'gray',
	'zinc' = 'zinc',
	'neutral' = 'neutral',
	'stone' = 'stone',
	'red' = 'red',
	'orange' = 'orange',
	'yellow' = 'yellow',
	'lime' = 'lime',
	'green' = 'green',
	'emerald' = 'emerald',
	'teal' = 'teal',
	'cyan' = 'cyan',
	'sky' = 'sky',
	'blue' = 'blue',
	'indigo' = 'indigo',
	'violet' = 'violet',
	'purple' = 'purple',
	'fuchsia' = 'fuchsia',
	'pink' = 'pink',
	'rose' = 'rose',
	'white' = 'white',
	'black' = 'black',
	'transparent' = 'transparent'
}
export const Colors = Object.values(ColorsEnum);

export type ColorShade = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type ColorAlpha =
	| '0'
	| '5'
	| '10'
	| '20'
	| '25'
	| '30'
	| '40'
	| '50'
	| '60'
	| '70'
	| '75'
	| '80'
	| '90'
	| '95'
	| '100';
export type ColorValue = `${Color}-${ColorShade}${`/${ColorAlpha}` | ''}`;
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xl' | '2xl';
export type FlexDirection = 'flex-row' | 'flex-col' | 'flex-row-reverse' | 'flex-col-reverse';
export type BorderRadius = 'rounded' | `rounded-${string}`;
