export interface Message {
    year: string;
    month: string;
    day: string;
    am: string;
    pm: string;
    today: string;
    ok: string;
    clear?: string;
    cancel?: string;
    time?: string;
    rangeStart?: string;
    rangeEnd?: string;
    selectRangeStart?: string;
    selectRangeEnd?: string;
    rangeMin?: string;
    rangeMax?: string;
    rangeMaxPeriod?: string;
    periodWeeks?: string;
    periodMonths?: string;
    periodYears?: string;
    periodPlaceholder?: string;
    period1w?: string;
    period1m?: string;
    period3m?: string;
    period6m?: string;
    period1y?: string;
    rangeDisabled?: string;
    rangeTimeOrder?: string;
    months: {
        full: string[];
        abbr: string[];
    }
    weeks: {
        full: string[];
        abbr: string[];
    }
}

export type MessageOptions = Partial<Omit<Message, 'months' | 'weeks'>> & {
    months?: Partial<Message['months']>;
    weeks?: Partial<Message['weeks']>;
};

