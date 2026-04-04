import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function CalorieCalculator({
  weight,
  height,
  age,
  gender,
  calculated,
  setWeight,
  setHeight,
  setAge,
  setGender,
  setCalculated,
}) {
  const [activityLevel, setActivityLevel] = useState('sedentary');
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  const handleCalculate = (ev) => {
    ev.preventDefault();
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);

    if (!w || !h || !a) {
      setCalculated({ error: 'Please enter valid numbers for all fields.' });
      return;
    }

    const bmr =
      gender === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;

    const tdee = bmr * activityMultipliers[activityLevel];

    const proteinTarget = w * 1.6;
    const fatTarget = (tdee * 0.25) / 9;
    const carbTarget = (tdee - proteinTarget * 4 - fatTarget * 9) / 4;

    setCalculated({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      proteinTarget: Math.round(proteinTarget),
      carbTarget: Math.round(carbTarget),
      fatTarget: Math.round(fatTarget),
      activityLevel,
    });
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>Energy calculator</h1>
        <p>Estimate BMR, TDEE, and balanced macro targets using the Mifflin–St Jeor equation.</p>
      </div>

      <div className="card">
        <h2>Your details</h2>
        <p className="settings-subcopy" style={{ marginTop: '-0.35rem' }}>
          Numbers are estimates. Adjust in Settings to match how you actually eat and train.
        </p>
        <form onSubmit={handleCalculate}>
          <div className="settings-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="calc-weight">
                Weight (kg)
              </label>
              <input
                id="calc-weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="calc-height">
                Height (cm)
              </label>
              <input
                id="calc-height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="calc-age">
                Age (years)
              </label>
              <input
                id="calc-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="calc-gender">
                Gender
              </label>
              <select id="calc-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="calc-activity">
              Activity level
            </label>
            <select id="calc-activity" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
              <option value="sedentary">Sedentary (little or no exercise)</option>
              <option value="light">Light (1–3 days / week)</option>
              <option value="moderate">Moderate (3–5 days / week)</option>
              <option value="active">Active (6–7 days / week)</option>
              <option value="veryActive">Very active (physical job or 2× daily training)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Calculate
          </button>
        </form>
      </div>

      {calculated && !calculated.error && (
        <div className="card">
          <h2>Results</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>{calculated.bmr}</h3>
              <p>BMR (kcal / day)</p>
            </div>
            <div className="summary-card">
              <h3>{calculated.tdee}</h3>
              <p>TDEE (kcal / day)</p>
            </div>
          </div>

          <h3 className="settings-subheading" style={{ marginTop: '1.25rem' }}>
            Suggested daily macros
          </h3>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>{calculated.proteinTarget}g</h3>
              <p>Protein</p>
            </div>
            <div className="summary-card">
              <h3>{calculated.carbTarget}g</h3>
              <p>Carbohydrates</p>
            </div>
            <div className="summary-card">
              <h3>{calculated.fatTarget}g</h3>
              <p>Fat</p>
            </div>
          </div>

          <div className="helper-note" style={{ marginTop: '1.25rem' }}>
            Use these as a starting point. For synced daily goals across devices, save targets in{' '}
            <Link to="/settings">Settings</Link>.
          </div>
        </div>
      )}

      {calculated && calculated.error && <div className="inline-error">{calculated.error}</div>}
    </div>
  );
}
