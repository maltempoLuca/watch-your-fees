import {Component, HostListener, LOCALE_ID, OnInit} from '@angular/core';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import {FormControl, FormGroup} from '@angular/forms';
import {DecimalPipe, formatCurrency} from '@angular/common';
import {TranslateService} from '@ngx-translate/core';

// @ts-ignore
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [{provide: LOCALE_ID, useValue: 'en-US'}, DecimalPipe], // Set default locale

})
export class AppComponent implements OnInit {
  locale: 'en-US' | 'it-IT' = 'en-US';
  investmentForm: FormGroup;
  investmentChart: Chart | null = null;
  title = 'how-banks-steal-your-money-app';
  canvas: HTMLCanvasElement | undefined;
  ctx: any;
  americanFlag: string = 'assets/us-flag.png'; // No leading './' or '/'
  italianFlag: string = 'assets/it-flag.png';
  isMobile: boolean = false;

  currentFlag: string = this.americanFlag; // Default to American flag
  protected readonly formatCurrency = formatCurrency;
  fadeEffect: boolean = false; // Control visibility of the effect

  private showFadeEffect(f: () => void) {
    this.fadeEffect = true; // Start the fade effect
    setTimeout(() => {
      f();
      this.fadeEffect = false; // End the fade effect after 1 second
    }, 345); // Match this duration with the CSS transition duration
  }

  constructor(private readonly translate: TranslateService, private decimalPipe: DecimalPipe) {
    // Set default language
    this.translate.setDefaultLang('en');
    this.translate.use('en');

    this.investmentForm = new FormGroup({
      investmentType: new FormControl('oneShot'),

      capitaleIniziale: new FormControl(100000),
      rendimentoAnnuo: new FormControl(7),
      anni: new FormControl(30),
      speseAnnue: new FormControl(3),
      speseAnnueInferiori: new FormControl(3),
      speseAnnueSuperiori: new FormControl(3),
    });
  }

  ngOnInit() {
    this.calculateFeesOnCapital();

    // Subscribe to language change events
    this.translate.onLangChange.subscribe(() => {
      this.calculateFeesOnCapital(); // Recalculate and redraw the chart when the language changes
    });

    // Add event listener for window resize
    window.addEventListener('resize', () => {
      this.investmentChart?.resize();
    });
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    // Check screen size on every resize
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
  }


  calculateFeesOnCapital() {
    const currentYear = new Date().getFullYear();
    const formsValue = this.investmentForm.value;

    const years: string[] = [];
    const capitalsBaseFees: number[] = [];
    const capitalsLowerFees: number[] = [];
    const capitalsHigherFees: number[] = [];

    // Fee rates for the three scenarios
    const baseFeeRate = formsValue.speseAnnue / 100;
    const lowerFeeRate = Math.max(0, baseFeeRate - 0.01);
    const higherFeeRate = Math.max(0, baseFeeRate + 0.01);
    this.investmentForm.get('speseAnnueInferiori')?.patchValue(Math.round(lowerFeeRate * 100));
    this.investmentForm.get('speseAnnueSuperiori')?.patchValue(Math.round(higherFeeRate * 100));

    for (let i = 0; i < +formsValue.anni; i++) {
      const year = currentYear + i;
      years.push(year.toString());
      capitalsBaseFees.push(this.compoundedPrincipal(this.investmentForm.get('capitaleIniziale')?.value, i, (this.investmentForm.get('rendimentoAnnuo')?.value - this.investmentForm.get('speseAnnue')?.value)));
      capitalsLowerFees.push(this.compoundedPrincipal(this.investmentForm.get('capitaleIniziale')?.value, i, (this.investmentForm.get('rendimentoAnnuo')?.value - this.investmentForm.get('speseAnnueInferiori')?.value)));
      capitalsHigherFees.push(this.compoundedPrincipal(this.investmentForm.get('capitaleIniziale')?.value, i, (this.investmentForm.get('rendimentoAnnuo')?.value - this.investmentForm.get('speseAnnueSuperiori')?.value)));
    }

    this.createLineChart(years, capitalsBaseFees, capitalsLowerFees, capitalsHigherFees);
  }


  yearsToDoubleCapitalInExpenses() {
    const formsValue = this.investmentForm.value;
    const rendimentoAnnuoInPercentuale = formsValue.rendimentoAnnuo / 100;
    const speseAnnueInPercentuale = formsValue.speseAnnue / 100;

    return this.calculateN(2, rendimentoAnnuoInPercentuale, speseAnnueInPercentuale).toFixed(1);
  }

  calculateN(k: number, r: number, c: number): number {
    const base = 1 + r;
    const logBase = Math.log(base);

    const logK = Math.log(k) / logBase;
    const logTerm = Math.log(1 + r - c) / logBase;

    return logK / (1 - logTerm);
  }

  getCurrencySymbol() {
    return this.locale === 'en-US' ? '$' : '€';
  }

  setFlag(flag: string) {
    this.showFadeEffect(() => {
      this.calculateFeesOnCapital();
      if (flag === 'us') {
        this.currentFlag = this.americanFlag;
        this.locale = "en-US";
        this.translate.use('en');
      } else {
        this.currentFlag = this.italianFlag;
        this.locale = "it-IT";
        this.translate.use('it');
      }
    });

  }

  private createLineChart(years: string[], baseFees: number[], lowerFees: number[], higherFees: number[]) {
    if (this.investmentChart) {
      this.investmentChart.destroy();
    }

    Chart.register(CategoryScale, LinearScale, LineElement, PointElement, LineController, Title, Tooltip, Legend, Filler);

    this.canvas = document.getElementById('investmentChart') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');

    if (this.ctx) {
      this.investmentChart = new Chart(this.ctx, {
        type: 'line',
        data: {
          labels: years,
          datasets: [
            {
              label: this.translate.instant('CAPITAL_WITH_HIGHER_FEES'),
              data: higherFees,
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.2)',
              borderWidth: 3,
              tension: 0.2,
              fill: 'origin', // Fill to the y-axis
              pointRadius: 0,
            },
            {
              label: this.translate.instant('CAPITAL_WITH_BASE_FEES', {baseFeeRate: this.investmentForm.get('speseAnnue')?.value}),
              data: baseFees,
              borderColor: '#f1c40f',
              backgroundColor: 'rgba(241, 196, 15, 0.2)',
              borderWidth: 3,
              tension: 0.2,
              fill: 0, // Fill to the baseFees dataset (index 0)
              pointRadius: 0,
            },
            {
              label: this.translate.instant('CAPITAL_WITH_LOWER_FEES'),
              data: lowerFees,
              borderColor: '#27ae60',
              backgroundColor: 'rgba(39, 174, 96, 0.2)', // Adjusted for transparency
              borderWidth: 3,
              tension: 0.2,
              fill: 1, // Fill to the lowerFees dataset (index 1)
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { /* ...legend config... */},
            title: { /* ...title config... */},
            // Tooltip configuration in the chart options
            tooltip: {
              enabled: false,
              external: (tooltipModel) => {
                const tooltipEl = document.getElementById('custom-tooltip');
                if (!tooltipEl) return;

                // Get the bounding rectangle of the chart canvas
                // @ts-ignore
                const canvasRect = this.canvas.getBoundingClientRect();

                if (tooltipModel.tooltip.dataPoints && tooltipModel.tooltip.dataPoints.length > 0) {
                  const dataPoint = tooltipModel.tooltip.dataPoints[0]; // Get the first data point
                  const index = dataPoint.dataIndex; // Get the index of the hovered point

                  const yearsOfCompound = Number(years[index]) - Number(years[0]);
                  const speseAnnueInferiori = this.investmentForm.get('speseAnnueInferiori')?.value;
                  const speseAnnueSuperiori = this.investmentForm.get('speseAnnueSuperiori')?.value;
                  const rendimentoAnnuo = this.investmentForm.get('rendimentoAnnuo')?.value;

                  let calculatedValueBase = this.compoundedPrincipal(this.investmentForm.get('capitaleIniziale')?.value, yearsOfCompound, rendimentoAnnuo);
                  const baseFeesPrincipal = Math.round(calculatedValueBase - baseFees[index]);
                  const lowerFeesPrincipal = Math.round(calculatedValueBase - lowerFees[index]);
                  const higherFeesPrincipal = Math.round(calculatedValueBase - higherFees[index]);

                  // Set tooltip content
                  tooltipEl.innerHTML = this.translate.instant('CAPITAL_FEES_TOOLTIP', {
                    years: yearsOfCompound,
                    lowerFeeRate: this.decimalPipe.transform(speseAnnueInferiori, '1.2-2'),
                    baseFeeRate: this.decimalPipe.transform(this.investmentForm.get('speseAnnue')?.value, '1.2-2'),
                    higherFeeRate: this.decimalPipe.transform(speseAnnueSuperiori, '1.2-2'),
                    lowerPrincipal: this.decimalPipe.transform(lowerFeesPrincipal, '1.2-2'),
                    basePrincipal: this.decimalPipe.transform(baseFeesPrincipal, '1.2-2'),
                    higherPrincipal: this.decimalPipe.transform(higherFeesPrincipal, '1.2-2'),
                    currency: this.getCurrencySymbol()
                  });

                  tooltipEl.style.opacity = '1';

                  // Position the tooltip at the center of the chart canvas
                  // Calculate the left position (centered horizontally)
                  const left = canvasRect.left + canvasRect.width / 2 - tooltipEl.clientWidth / 2;
                  const canvasSize = canvasRect.bottom - canvasRect.top;

                  // Calculate the scroll offset for proper positioning
                  const scrollTop = window.scrollY || (document.documentElement?.scrollTop) || document.body.scrollTop;
                  const scrollLeft = window.scrollX || (document.documentElement?.scrollLeft) || document.body.scrollLeft;

                  if (!this.isMobile) {
                    // Desktop: Place the tooltip just above the chart
                    const top = canvasRect.top + scrollTop - tooltipEl.clientHeight + canvasSize / 5;
                    tooltipEl.style.left = `${left + scrollLeft}px`;
                    tooltipEl.style.top = `${top}px`;
                  } else {
                    // Mobile: Position the tooltip below the chart
                    const top = canvasRect.top + scrollTop + tooltipEl.clientHeight / 2 + tooltipEl.clientHeight / 7;
                    tooltipEl.style.left = `${left + scrollLeft}px`;
                    tooltipEl.style.top = `${top}px`;
                  }
                } else {
                  tooltipEl.style.opacity = '0';
                }
              },
            },
          },
          interaction: {
            mode: 'nearest',
            intersect: false, // Allow for proximity detection
            // You can also add a threshold if necessary (not available in all versions)
            // axis: 'x', // Optional to limit to x-axis hover only
          },
          scales: {
            x: { /* ...x-axis config... */},
            y: { /* ...y-axis config... */},
          },
        },
      });

      this.canvas.addEventListener('mouseout', () => {
        // When mouse leaves the chart area, set tooltip opacity to 0
        const tooltipEl = document.getElementById('custom-tooltip');
        if (tooltipEl) {
          setTimeout(() => {
            tooltipEl.style.opacity = '0';
          }, 50)
        }
        this.investmentChart?.update();
      });
    }
  }

  // Example function for your custom text
  private compoundedPrincipal(startingCapital: number, years: number, ratePercentage: number): number {
    return Math.round(startingCapital * Math.pow((1 + ratePercentage / 100), years));
  }

}
