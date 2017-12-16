'use strict';

module.exports = {
  raw: response => {
    if (response && response.Items) {
      response = Object.assign({}, response);
      response.Items.forEach(item => {
        if (item.Data) item.Data = JSON.stringify(item.Data);
      });
      response.Count = response.Items.length;
      response.ScannedCount = response.Items.length * 10;
      return response;
    }
    return {
      Items: [
        {
          Data: JSON.stringify(1)
        },
        {
          Data: JSON.stringify('string')
        },
        {
          Data: JSON.stringify(true)
        },
        {
          Data: JSON.stringify([1, 'string', true])
        },
        {
          Data: JSON.stringify({ key: 'value' })
        }
      ]
    };
  },
  parsed: () => ({
    Items: [
      {
        Data: 1
      },
      {
        Data: 'string'
      },
      {
        Data: true
      },
      {
        Data: [1, 'string', true]
      },
      {
        Data: { key: 'value' }
      }
    ]
  })
};
