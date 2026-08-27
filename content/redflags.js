/*
 * Static, educational red-flag checklist from TransparentCars' buying guide.
 * NO data processing — this list is identical on every listing. It exists to
 * make the buyer look, not to accuse any specific seller.
 */
(function () {
  'use strict';
  if (!window.__TC) return;

  window.__TC.REDFLAGS = [
    {
      title: 'Clocked mileage',
      body: 'Steering wheel, pedals or seat worn beyond the stated mileage? Ask for the inspection (IPO) history — the odometer is recorded at every inspection.'
    },
    {
      title: 'Hidden damage',
      body: 'Mismatched paint shades, uneven panel gaps or marked bolts suggest accident repair. View the car in daylight.'
    },
    {
      title: 'Debts and fines follow the car',
      body: 'Unpaid road tax (IUC), liens or a retention-of-title clause pass to you. Confirm everything is paid and free of charges BEFORE transferring ownership.'
    },
    {
      title: 'Fake "private" seller',
      body: 'Several cars from the same contact, or a deposit asked before you see the car? Stop. A genuine private seller lets you view and test without pressure.'
    },
    {
      title: 'Surprise fees at the end',
      body: 'Prep, documentation or reservation costs that appear only at closing. Ask for the final all-in price in writing before you commit.'
    }
  ];
})();
