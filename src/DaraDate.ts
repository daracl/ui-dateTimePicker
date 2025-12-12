import dateFormat from './format';

export class DaraDate {

    private date;

    constructor(dt: Date) {
        this.date = dt;
    }

    public setYear(num: number) {
        this.date.setFullYear(num);
        return this;
    }

    public addYear(num: number) {
        this.date.setFullYear(this.date.getFullYear() + num);
        return this;
    }

    public addMonth(num: number) {
        this.date.setMonth(this.date.getMonth() + num);
        return this;
    }

    public setMonth(num: number) {
        this.date.setMonth(num);
        return this;
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
        return dateFormat(this.date, format);
    }

    public clone() {
        return new DaraDate(new Date(this.date.valueOf()));
    }

}