import dateFormat from './format';
import defaultLanguage, { Language } from './Lanauage';

export class DaraDate {

    private date;

    constructor(dt: Date, private language: Language = defaultLanguage) {
        this.date = new Date(dt.getTime());
    }

    public setYear(num: number) {
        const day = this.date.getDate();
        this.date.setDate(1);
        this.date.setFullYear(num);
        this.date.setDate(Math.min(day, this.daysInMonth()));
        return this;
    }

    public addYear(num: number) {
        return this.setYear(this.date.getFullYear() + num);
    }

    public addMonth(num: number) {
        return this.setMonth(this.date.getMonth() + num);
    }

    public setMonth(num: number) {
        const day = this.date.getDate();
        this.date.setDate(1);
        this.date.setMonth(num);
        this.date.setDate(Math.min(day, this.daysInMonth()));
        return this;
    }

    private daysInMonth() {
        const end = new Date(this.date.getTime());
        end.setMonth(end.getMonth() + 1, 0);
        return end.getDate();
    }

    public setDate(num: number) {
        this.date.setDate(num);
        return this;
    }

    public addDate(num: number) {
        this.date.setDate(this.date.getDate() + num);
        return this;
    }

    public addWeek(num: number) {
        this.date.setDate(this.date.getDate() + (num * 7));
        return this;
    }

    public addHours(num: number) {
        this.date.setHours(this.date.getHours() + num);
        return this;
    }

    public setHour(num: number) {
        this.date.setHours(num);
        return this;
    }

    public addMinutes(num: number) {
        this.date.setMinutes(this.date.getMinutes() + num);
        return this;
    }

    public setMinutes(num: number) {
        this.date.setMinutes(num);
        return this;
    }

    public addSeconds(num: number) {
        this.date.setSeconds(this.date.getSeconds() + num);
        return this;
    }

    public addMilliseconds(num: number) {
        this.date.setMilliseconds(this.date.getMilliseconds() + num);
        return this;
    }

    public compare(date: Date) {

        if (this.date.valueOf() < date.valueOf()) {
            return -1;
        } else if (this.date.valueOf() > date.valueOf()) {
            return 1;
        }
        return 0;
    }

    public getYear() {
        return this.date.getFullYear();
    }

    public getMonth() {
        return this.date.getMonth() + 1;
    }

    public getDate() {
        return this.date.getDate();
    }

    public getDay() {
        return this.date.getDay();
    }

    public getTime() {
        return this.date.getTime();
    }

    public format(format: string): string {
        return dateFormat(this.date, format, this.language);
    }

    public clone() {
        return new DaraDate(new Date(this.date.valueOf()), this.language);
    }

}
