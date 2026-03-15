/**
 * Rule Engine
 * Evaluates an ordered list of rules against a user object.
 * First matching rule wins (priority ASC).
 */

function testCondition(condition, user) {
  const { field, operator, value } = condition;

  let userValue;
  if (field === 'emailDomain') {
    userValue = (user.email || '').split('@')[1] || '';
  } else if (field === 'group') {
    userValue = user.groups || [];
  } else {
    userValue = (user[field] || '').toString().toLowerCase();
  }

  const normalize = (v) => (v || '').toString().toLowerCase().trim();

  switch (operator) {
    case 'equals':
      if (field === 'group') {
        return userValue.map(normalize).includes(normalize(value));
      }
      return normalize(userValue) === normalize(value);

    case 'notEquals':
      return normalize(userValue) !== normalize(value);

    case 'contains':
      return normalize(userValue).includes(normalize(value));

    case 'startsWith':
      return normalize(userValue).startsWith(normalize(value));

    case 'endsWith':
      return normalize(userValue).endsWith(normalize(value));

    case 'in': {
      const valArray = Array.isArray(value) ? value.map(normalize) : [normalize(value)];
      if (field === 'group') {
        return userValue.map(normalize).some((g) => valArray.includes(g));
      }
      return valArray.includes(normalize(userValue));
    }

    default:
      return false;
  }
}

function evaluateRule(rule, user) {
  const { conditions, logic } = rule;

  if (!conditions || conditions.length === 0) return false;

  if (logic === 'AND') {
    return conditions.every((c) => testCondition(c, user));
  } else {
    return conditions.some((c) => testCondition(c, user));
  }
}

/**
 * Evaluate all rules against a user.
 * @param {Array} rules - Sorted by priority ASC, populated with assignTemplate / assignBusinessUnit
 * @param {Object} user - Plain user object or mongoose doc
 * @returns {{ template, businessUnit, matchedRule }}
 */
function evaluateRules(rules, user) {
  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (evaluateRule(rule, user)) {
      return {
        template: rule.assignTemplate || null,
        businessUnit: rule.assignBusinessUnit || null,
        matchedRule: rule,
      };
    }
  }
  return { template: null, businessUnit: null, matchedRule: null };
}

module.exports = { evaluateRules, evaluateRule, testCondition };
