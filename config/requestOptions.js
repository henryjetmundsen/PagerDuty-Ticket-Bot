const keys = require('./keys');

module.exports = {
  onCall: {
    url: "https://api.pagerduty.com/oncalls?time_zone=UTC&escalation_policy_ids%5B%5D=P67HF4O",
    json: true,
    headers: {
      Authorization: keys.PagerDutyAuth,
      Accept: "application/vnd.pagerduty+json;version=2"
    }
  },

  escalation: {
    url: "https://api.pagerduty.com/oncalls?time_zone=UTC&escalation_policy_ids%5B%5D=P67HF4O",
    json: true,
    headers: {
      Authorization: keys.PagerDutyAuth,
      Accept: "application/vnd.pagerduty+json;version=2"
    }
  },

  slackUsers: {
    uri: "https://slack.com/api/users.list",
    json: true,
    qs: {
      token: keys.SlackToken
    }
  }
}
