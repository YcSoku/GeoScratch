export type DataType = 'f' | 'i' | 'u';

export class Numeric {

    constructor(type: string, data: any): Numeric;

    set data(value: any): void;

    get data(): any;

    get type(): string

    set type(type: DataType);

    get state(): { type: string, value: Function };

    static purifying(data: any): any;

    purify(data: any): any;
}