from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models.orm import Alert, AlertPref, City, Favorite, User
from ..schemas import AlertOut, AlertPrefCreate, FavoriteCreate

router = APIRouter(prefix="/api", tags=["favorites & alerts"])


def _get_or_create_city(db: Session, name: str) -> City:
    city = db.query(City).filter(City.name == name).first()
    if not city:
        city = City(name=name)
        db.add(city)
        db.commit()
        db.refresh(city)
    return city


@router.post("/favorites")
def add_favorite(
    payload: FavoriteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    city = _get_or_create_city(db, payload.city)
    existing = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.city_id == city.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="City already in favorites")

    fav = Favorite(user_id=user.id, city_id=city.id)
    db.add(fav)
    db.commit()
    return {"message": f"{payload.city} added to favorites"}


@router.get("/favorites")
def list_favorites(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    favs = db.query(Favorite).filter(Favorite.user_id == user.id).all()
    cities = [db.query(City).get(f.city_id).name for f in favs]
    return {"favorites": cities}


@router.delete("/favorites/{city_name}")
def remove_favorite(city_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    city = db.query(City).filter(City.name == city_name).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    fav = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.city_id == city.id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")
    db.delete(fav)
    db.commit()
    return {"message": f"{city_name} removed from favorites"}


@router.post("/alerts/preferences")
def set_alert_preference(
    payload: AlertPrefCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    city = _get_or_create_city(db, payload.city)
    pref = AlertPref(
        user_id=user.id,
        city_id=city.id,
        threshold_aqi=payload.threshold_aqi,
        email_enabled=payload.email_enabled,
    )
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return {"message": "Alert preference saved", "id": pref.id}


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pref_ids = [p.id for p in db.query(AlertPref).filter(AlertPref.user_id == user.id).all()]
    if not pref_ids:
        return []
    alerts = db.query(Alert).filter(Alert.alert_pref_id.in_(pref_ids)).order_by(Alert.date.desc()).all()
    return alerts
