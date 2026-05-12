declare module 'react-select-country-list' {
  export interface CountryData {
    label: string;
    value: string;
  }

  export interface CountryList {
    getData(): CountryData[];
  }

  export default function countryList(): CountryList;
}
