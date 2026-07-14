const isNotEmpty = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null;

export default isNotEmpty;
