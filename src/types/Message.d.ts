export interface Message {
    year: string;
    month: string;
    day: string;
    am: string;
    pm: string;
    today: string;
    ok: string;
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

