import {Component, LOCALE_ID, OnInit} from '@angular/core';
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
import {formatCurrency} from '@angular/common';
import {TranslateService} from '@ngx-translate/core';

// @ts-ignore
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [{provide: LOCALE_ID, useValue: 'en-US'}], // Set default locale

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

  currentFlag: string = this.americanFlag; // Default to American flag
  showEffect = false; // Control visibility of the effect
  protected readonly formatCurrency = formatCurrency;
  fadeEffect: boolean = false; // Control visibility of the effect
  private isAnimating: boolean = false;

  private showFadeEffect(f: () => void) {
    this.fadeEffect = true; // Start the fade effect
    setTimeout(() => {
      f();
      this.fadeEffect = false; // End the fade effect after 1 second
    }, 345); // Match this duration with the CSS transition duration
  }

  constructor(private translate: TranslateService) {
    // Set default language
    this.translate.setDefaultLang('en');
    this.translate.use('en');

    this.investmentForm = new FormGroup({
      investmentType: new FormControl('oneShot'),

      capitaleIniziale: new FormControl(100000),
      rendimentoAnnuo: new FormControl(7),
      anni: new FormControl(30),
      speseAnnue: new FormControl(3)
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
  }


  calculateFeesOnCapital() {
    const currentYear = new Date().getFullYear();
    const formsValue = this.investmentForm.value;

    const years: string[] = [];
    const capitalsBaseFees: number[] = [];
    const capitalsLowerFees: number[] = [];
    const capitalsHigherFees: number[] = [];

    const initialCapital = formsValue.capitaleIniziale;
    const annualReturnRate = formsValue.rendimentoAnnuo / 100;

    // Fee rates for the three scenarios
    const baseFeeRate = formsValue.speseAnnue / 100;
    const lowerFeeRate = Math.max(0, baseFeeRate - 0.01); // Ensure it doesn't go below 0%
    const higherFeeRate = Math.min(annualReturnRate - 0.01, baseFeeRate + 0.01); // Ensure it's less than interest

    for (let i = 0; i < +formsValue.anni; i++) {
      const year = currentYear + i;
      years.push(year.toString());

      capitalsBaseFees.push(this.calculateCapital(initialCapital, annualReturnRate, baseFeeRate, i));
      capitalsLowerFees.push(this.calculateCapital(initialCapital, annualReturnRate, lowerFeeRate, i));
      capitalsHigherFees.push(this.calculateCapital(initialCapital, annualReturnRate, higherFeeRate, i));
    }

    this.createLineChart(years, capitalsBaseFees, capitalsLowerFees, capitalsHigherFees);
  }

// Helper function to calculate capital based on fee rate
  private calculateCapital(initialCapital: number, annualReturnRate: number, feeRate: number, years: number): number {
    const accumulatedInterest = (initialCapital * (1 + annualReturnRate) ** (years + 1)) - initialCapital;
    const accumulatedFee = (initialCapital * (1 + feeRate) ** (years + 1)) - initialCapital;
    return initialCapital + accumulatedInterest - accumulatedFee;
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
              label: this.translate.instant('CAPITAL_WITH_BASE_FEES'),
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

                  // Only show tooltip if mouse is inside the chart area
                  // Retrieve your fee values
                  const lowerFeeValue = lowerFees[index];
                  const baseFeeValue = baseFees[index];
                  const higherFeeValue = higherFees[index];
                  const calculatedValue = this.performCustomCalculation(lowerFeeValue, baseFeeValue, higherFeeValue);

                  const testoToolTip: string = `Dopo ${years[index]} anni avrai pagato in commissioni:\n` +
                    `a 2% = ${calculatedValue} ${this.getCurrencySymbol()}\n` +
                    `a 3% = ${calculatedValue} ${this.getCurrencySymbol()}\n` +
                    `a 4% = ${calculatedValue} ${this.getCurrencySymbol()}\n`;

                  // Set tooltip content
                  tooltipEl.innerHTML = testoToolTip;
                  console.log('opacity set to 1')
                  tooltipEl.style.opacity = '1';

                  // Position the tooltip at the center of the chart canvas
                  const canvasSize = canvasRect.bottom - canvasRect.top;
                  const centerX = canvasRect.left + canvasRect.width / 2 - tooltipEl.clientWidth / 2; // Centered horizontally
                  const topY = canvasRect.top - tooltipEl.clientHeight + canvasSize / 5; // Above the chart

                  tooltipEl.style.left = `${centerX}px`;
                  tooltipEl.style.top = `${topY}px`;
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
          console.log('it enters here but the tooltip remains visible');
          setTimeout(() => {
            tooltipEl.style.opacity = '0';
          }, 50)
        }
        this.investmentChart?.update();
      });
    }
  }

  // Example function for your custom text
  private performCustomCalculation(lowerFee: number, baseFee: number, higherFee: number): number {
    // Example: Simple average, replace with your actual calculation logic
    return (lowerFee + baseFee + higherFee) / 3;
  }


}
