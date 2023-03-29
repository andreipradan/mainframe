import React, {useEffect} from 'react';
import {Bar, Pie, Doughnut} from 'react-chartjs-2';
import {useDispatch, useSelector} from "react-redux";
import TransactionsApi from "../../api/transactions";
import {Circles} from "react-loader-spinner";

const getColorGradient = (context, border = false) => {
    const ctx = context.chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, border ? context.height || 100 : 200);
    gradient.addColorStop(0, `rgba(255, 99, 132,${border ? 1 : 0.2})`);
    gradient.addColorStop(0.5, `rgb(255,210,64,${border ? 1 : 0.2})`);
    gradient.addColorStop(1, `rgba(75,192,126${border ? '' : ',0.2'})`);
    return gradient;
}

const Expenses = () => {
    const dispatch = useDispatch();
    const { overview, loading } = useSelector(state => state.transactions)
    const token = useSelector((state) => state.auth.token)
    useEffect(() => {
        (!overview || !overview) && dispatch(TransactionsApi.getOverview(token))
    }, [dispatch, overview, token]);

    const data = {
        labels: overview?.per_year?.map(y => y.year) || [],
        datasets: [{
          label: '# of Transactions',
          data: overview?.per_year?.map(y => y.count) || [],
          backgroundColor: context => getColorGradient(context),
          borderColor: context => getColorGradient(context, true),
          borderWidth: 1,
          fill: false
        }]
    };

    const inOutData = {
        labels: ["Money In", "Money Out"],
        datasets: [{
          label: '# of Transactions',
          data: [overview?.money_in, overview?.money_out],
          backgroundColor: [
            'rgba(75,192,126,0.2)',
            'rgba(255, 99, 132, 0.2)',
          ],
          borderColor: [
            'rgb(75,192,126)',
            'rgba(255,99,132)',
          ],
          borderWidth: 1,
          fill: false
        }]
    };

    const options = {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          },
          gridLines: {
            color: "rgba(204, 204, 204,0.1)"
          }
        }],
        xAxes: [{
          gridLines: {
            color: "rgba(204, 204, 204,0.1)"
          }
        }]
      },
      legend: {
        display: false
      },
      elements: {
        point: {
          radius: 0
        }
      }
    }

    const perTypeData = {
        labels: overview?.per_type?.map(p => p.type) || [],
        datasets: [{
          label: 'Amount',
          data: overview?.per_type?.map(p => p.count) || [],
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)',
            'rgba(208,93,172,0.5)',
            'rgba(330, 235, 215, 0.5)',
            'rgba(26,193,23,0.5)',
            'rgba(31, 5, 64, 0.5)',
            'rgba(214, 55, 64, 0.5)',
            'rgba(277, 205, 94, 0.5)',
          ],
          borderColor: [
            'rgba(255,99,132,1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(208,93,172, 1)',
            'rgba(330, 235, 215, 1)',
            'rgba(26,193,23, 1)',
            'rgba(31, 5, 64, 1)',
            'rgba(214, 55, 64, 1)',
            'rgba(277, 205, 94, 1)',
          ],
          borderWidth: 1,
          fill: true, // 3: no fill
        }]
    };

    const doughnutPieOptions = {
        responsive: true,
        animation: {
          animateScale: true,
          animateRotate: true
        }
    };

    const perCurrencyData = {
        labels: overview?.per_currency.map(c => c.currency) || [],
        datasets: [{
          label: 'Money in',
          data: overview?.per_currency.map(c => c.money_in) || [],
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
          ],
          borderColor: [
            'rgba(255,99,132,1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1,
          fill: true, // 3: no fill
        },
            {
          label: 'Money out',
          data: overview?.per_currency.map(c => c.money_out) || [],
          backgroundColor: [
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1,
          fill: true, // 3: no fill
        }
        ]
    };

    return (
        <div>
            <div className="page-header">
                <h3 className="page-title">
                    Expenses
                    <button type="button"
                      className="btn btn-outline-success btn-sm border-0 bg-transparent"
                      onClick={
                        () => {dispatch(TransactionsApi.getOverview(token))}
                      }>
                      <i className="mdi mdi-refresh"></i>
                    </button>
                </h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                    <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Expenses</a></li>
                    <li className="breadcrumb-item active" aria-current="page">All</li>
                    </ol>
                </nav>
            </div>
            {loading
                  ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{}}
                      wrapperClass={{}}
                      color='orange'
                    />
                  : <>
                    <div className="row">
                        <div className="col-lg-6 grid-margin stretch-card">
                        <div className="card">
                            <div className="card-body">
                                <h4 className="card-title">Transactions per year</h4>
                                <Bar data={data} options={options} />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 grid-margin stretch-card">
                        <div className="card">
                            <div className="card-body">
                                <h4 className="card-title">Money In / Money Out</h4>
                                <Pie data={inOutData} options={doughnutPieOptions} />
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="row">
                        <div className="col-lg-6 grid-margin stretch-card">
                            <div className="card">
                                <div className="card-body">
                                    <h4 className="card-title">Amount per type</h4>
                                    <Doughnut data={perTypeData} options={doughnutPieOptions} />
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 grid-margin stretch-card">
                            <div className="card">
                                <div className="card-body">
                                    <h4 className="card-title">Money in / Out per currency</h4>
                                    <Bar data={perCurrencyData} />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            }

        </div>
    )
}

export default Expenses
