export const doughnutPieOptions = {
  responsive: true,
  animation: {
    animateScale: true,
    animateRotate: true
  }
};

export const getLightsData = (onCount, offCount) => ({
  datasets: [{
      data: [onCount, offCount],
      backgroundColor: [
        'rgba(75, 192, 192, 0.5)',
        'rgba(255, 99, 132, 0.5)',
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255,99,132,1)',
      ],
    }],

    // These labels appear in the legend and in the tooltips when hovering different arcs
    labels: [
      "On",
      "Off",
    ]
})

export const sliderSettings = {infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1}
