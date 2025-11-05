import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateDisplay',
})
export class DateDisplayPipe implements PipeTransform {
  constructor(private datePipe: DatePipe) {}

  transform(date: Date | string | number | undefined): string {
    if (!date) return '';
    let millis: number | undefined;
    if (date instanceof Date) {
      millis = date.getTime();
    } else if (typeof date === 'string') {
      const d = new Date(date);
      millis = isNaN(d.getTime()) ? undefined : d.getTime();
    } else if (typeof date === 'number') {
      millis = date;
    }
    return this.datePipe.transform(millis, 'short') ?? '';
  }
}
