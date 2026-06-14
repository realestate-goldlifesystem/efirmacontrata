/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number; // in COP or USD
  rentOrSale: 'rent' | 'sale';
  type: 'apartment' | 'house' | 'commercial' | 'penthouse';
  location: string;
  city: string;
  beds: number;
  baths: number;
  area: number; // in m2
  imageUrl: string;
  isFeatured?: boolean;
  featuredHighlight?: string;
  amenities: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  text: string;
  imageUrl: string;
  rating: number;
}

export interface InsurancePartner {
  name: string;
  logoType: 'zurich' | 'libertador' | 'prosear' | 'sura' | 'mundial' | 'aptuno';
  badgeColor: string;
}
