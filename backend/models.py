from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import secrets

from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), nullable=False, unique=True)
    display_name = db.Column(db.String(128), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(32), nullable=False, default="lab")  # 'manager' or 'lab'
    group_id = db.Column(db.Integer, db.ForeignKey("lab_groups.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "role": self.role,
            "group_id": self.group_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LabGroup(db.Model):
    __tablename__ = "lab_groups"
    id = db.Column(db.Integer, primary_key=True)
    lab_name = db.Column(db.String(128), nullable=False)
    group_name = db.Column(db.String(128), nullable=False)
    owner_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "lab_name": self.lab_name,
            "group_name": self.group_name,
            "owner_user_id": self.owner_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class LabInvite(db.Model):
    __tablename__ = "lab_invites"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(256), nullable=False, index=True)
    group_id = db.Column(db.Integer, db.ForeignKey("lab_groups.id"), nullable=False)
    invited_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(32), nullable=False, default="lab")
    status = db.Column(db.String(32), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    accepted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "group_id": self.group_id,
            "invited_by_user_id": self.invited_by_user_id,
            "role": self.role,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
        }


class AuthToken(db.Model):
    """Simple persistent session token — no external JWT library needed."""
    __tablename__ = "auth_tokens"
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), nullable=False, unique=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref="tokens")

    @staticmethod
    def generate(user_id):
        token_str = secrets.token_urlsafe(48)
        token = AuthToken(token=token_str, user_id=user_id)
        db.session.add(token)
        db.session.commit()
        return token_str


class InventoryItem(db.Model):
    __tablename__ = "inventory_items"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    category = db.Column(db.String(128), nullable=True)
    location_stored = db.Column(db.String(128), nullable=True)
    catalog_number = db.Column(db.String(64), nullable=True)
    vendor = db.Column(db.String(128), nullable=True)
    requested_by = db.Column(db.String(128), nullable=True)
    lab_name = db.Column(db.String(128), nullable=True)
    actual_quantity = db.Column(db.Float, nullable=False, default=0)
    desired_quantity = db.Column(db.Float, nullable=True)
    need_to_order = db.Column(db.Boolean, default=False)
    order_quantity = db.Column(db.Float, nullable=True)
    order_status = db.Column(db.String(32), nullable=False, default="in_stock")
    in_process_quantity = db.Column(db.Float, nullable=False, default=0)
    ordered_at = db.Column(db.DateTime, nullable=True)
    received_at = db.Column(db.DateTime, nullable=True)
    last_order_date = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        actual = float(self.actual_quantity or 0)
        desired = float(self.desired_quantity or 0)
        need_quantity = max(0.0, desired - actual)
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "location_stored": self.location_stored,
            "catalog_number": self.catalog_number,
            "vendor": self.vendor,
            "requested_by": self.requested_by,
            "lab_name": self.lab_name,
            "actual_quantity": self.actual_quantity,
            "desired_quantity": self.desired_quantity,
            "need_quantity": need_quantity,
            "need_to_order": self.need_to_order,
            "order_quantity": self.order_quantity,
            "order_status": self.order_status,
            "in_process_quantity": self.in_process_quantity,
            "ordered_at": self.ordered_at.isoformat() if self.ordered_at else None,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "last_order_date": self.last_order_date.isoformat() if self.last_order_date else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PurchaseHistory(db.Model):
    __tablename__ = "purchase_history"
    id = db.Column(db.Integer, primary_key=True)
    inventory_item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=True)
    item_name = db.Column(db.String(256), nullable=False)
    category = db.Column(db.String(128), nullable=True)
    catalog_number = db.Column(db.String(64), nullable=True)
    vendor = db.Column(db.String(128), nullable=True)
    requested_by = db.Column(db.String(128), nullable=True)
    lab_name = db.Column(db.String(128), nullable=True)
    quantity_ordered = db.Column(db.Float, nullable=False, default=0)
    quantity_received = db.Column(db.Float, nullable=False, default=0)
    status = db.Column(db.String(32), nullable=False, default="ordered")
    ordered_at = db.Column(db.DateTime, nullable=True)
    received_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "inventory_item_id": self.inventory_item_id,
            "item_name": self.item_name,
            "category": self.category,
            "catalog_number": self.catalog_number,
            "vendor": self.vendor,
            "requested_by": self.requested_by,
            "lab_name": self.lab_name,
            "quantity_ordered": self.quantity_ordered,
            "quantity_received": self.quantity_received,
            "status": self.status,
            "ordered_at": self.ordered_at.isoformat() if self.ordered_at else None,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
