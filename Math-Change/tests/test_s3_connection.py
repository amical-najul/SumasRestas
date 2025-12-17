"""
S3/MinIO Bucket Connection Test
================================
Este script prueba la conexión con el bucket S3/MinIO y realiza operaciones CRUD.

Ejecutar con:
    cd backend
    python test_s3_connection.py
"""

import os
import sys
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime
import io

# Cargar variables de entorno desde la raíz del proyecto
load_dotenv(dotenv_path='../.env')
load_dotenv(dotenv_path='./.env')  # Si se ejecuta desde la raíz
load_dotenv()  # Fallback

# Configuración S3
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY")
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")

def log(msg, status="INFO"):
    icons = {"INFO": "ℹ️", "OK": "✅", "ERROR": "❌", "WARN": "⚠️", "TEST": "🧪"}
    print(f"{icons.get(status, '•')} [{status}] {msg}")

def check_config():
    """Verificar que todas las variables estén configuradas"""
    log("Verificando configuración S3...", "TEST")
    
    missing = []
    if not S3_ACCESS_KEY:
        missing.append("S3_ACCESS_KEY")
    if not S3_SECRET_KEY:
        missing.append("S3_SECRET_KEY")
    if not S3_ENDPOINT_URL:
        missing.append("S3_ENDPOINT_URL")
    if not S3_BUCKET_NAME:
        missing.append("S3_BUCKET_NAME")
    
    if missing:
        log(f"Variables faltantes: {', '.join(missing)}", "ERROR")
        log("Configura estas variables en el archivo .env", "WARN")
        return False
    
    log(f"Endpoint: {S3_ENDPOINT_URL}", "INFO")
    log(f"Bucket: {S3_BUCKET_NAME}", "INFO")
    log(f"Region: {S3_REGION}", "INFO")
    log(f"Access Key: {S3_ACCESS_KEY[:5]}...", "INFO")
    log("Configuración completa", "OK")
    return True

def get_s3_client():
    """Crear cliente S3"""
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name=S3_REGION
    )

def test_connection(s3):
    """Test 1: Verificar conexión listando buckets"""
    log("Test 1: Conexión al servidor S3...", "TEST")
    try:
        response = s3.list_buckets()
        buckets = [b['Name'] for b in response.get('Buckets', [])]
        log(f"Buckets encontrados: {buckets}", "OK")
        return True
    except NoCredentialsError:
        log("Credenciales inválidas", "ERROR")
        return False
    except ClientError as e:
        log(f"Error de cliente: {e}", "ERROR")
        return False
    except Exception as e:
        log(f"Error de conexión: {e}", "ERROR")
        return False

def test_bucket_exists(s3):
    """Test 2: Verificar que el bucket existe"""
    log(f"Test 2: Verificar bucket '{S3_BUCKET_NAME}'...", "TEST")
    try:
        s3.head_bucket(Bucket=S3_BUCKET_NAME)
        log(f"Bucket '{S3_BUCKET_NAME}' existe y es accesible", "OK")
        return True
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            log(f"Bucket '{S3_BUCKET_NAME}' no existe", "ERROR")
            log("Intentando crear el bucket...", "WARN")
            try:
                s3.create_bucket(Bucket=S3_BUCKET_NAME)
                log(f"Bucket '{S3_BUCKET_NAME}' creado exitosamente", "OK")
                return True
            except Exception as create_err:
                log(f"No se pudo crear el bucket: {create_err}", "ERROR")
                return False
        elif error_code == '403':
            log("Acceso denegado al bucket", "ERROR")
            return False
        else:
            log(f"Error: {e}", "ERROR")
            return False

def test_create_object(s3):
    """Test 3: CREATE - Subir un archivo de prueba"""
    log("Test 3: CREATE - Subir archivo de prueba...", "TEST")
    
    test_filename = f"test_crud_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    test_content = f"Prueba CRUD - {datetime.now().isoformat()}\nMath-Change S3 Test"
    
    try:
        s3.upload_fileobj(
            io.BytesIO(test_content.encode('utf-8')),
            S3_BUCKET_NAME,
            test_filename,
            ExtraArgs={'ContentType': 'text/plain'}
        )
        log(f"Archivo '{test_filename}' subido exitosamente", "OK")
        return test_filename
    except Exception as e:
        log(f"Error al subir archivo: {e}", "ERROR")
        return None

def test_read_object(s3, filename):
    """Test 4: READ - Leer el archivo subido"""
    log(f"Test 4: READ - Leer archivo '{filename}'...", "TEST")
    
    try:
        response = s3.get_object(Bucket=S3_BUCKET_NAME, Key=filename)
        content = response['Body'].read().decode('utf-8')
        log(f"Contenido leído: {content[:50]}...", "OK")
        return True
    except Exception as e:
        log(f"Error al leer archivo: {e}", "ERROR")
        return False

def test_list_objects(s3):
    """Test 5: LIST - Listar objetos en el bucket"""
    log("Test 5: LIST - Listar objetos en el bucket...", "TEST")
    
    try:
        response = s3.list_objects_v2(Bucket=S3_BUCKET_NAME, MaxKeys=10)
        objects = response.get('Contents', [])
        log(f"Objetos encontrados: {len(objects)}", "OK")
        for obj in objects[:5]:
            log(f"  - {obj['Key']} ({obj['Size']} bytes)", "INFO")
        return True
    except Exception as e:
        log(f"Error al listar objetos: {e}", "ERROR")
        return False

def test_delete_object(s3, filename):
    """Test 6: DELETE - Eliminar archivo de prueba"""
    log(f"Test 6: DELETE - Eliminar archivo '{filename}'...", "TEST")
    
    try:
        s3.delete_object(Bucket=S3_BUCKET_NAME, Key=filename)
        log(f"Archivo '{filename}' eliminado exitosamente", "OK")
        return True
    except Exception as e:
        log(f"Error al eliminar archivo: {e}", "ERROR")
        return False

def test_public_url(filename):
    """Test 7: Verificar URL pública"""
    log("Test 7: Generar URL pública...", "TEST")
    
    url = f"{S3_ENDPOINT_URL}/{S3_BUCKET_NAME}/{filename}"
    log(f"URL pública: {url}", "OK")
    return url

def main():
    print("\n" + "="*60)
    print("🧪 S3/MinIO BUCKET CONNECTION TEST - CRUD")
    print("="*60 + "\n")
    
    # Verificar configuración
    if not check_config():
        print("\n❌ TEST FALLIDO: Configuración incompleta")
        sys.exit(1)
    
    print("\n" + "-"*40 + "\n")
    
    # Crear cliente S3
    s3 = get_s3_client()
    
    results = []
    
    # Test 1: Conexión
    results.append(("Conexión", test_connection(s3)))
    
    # Test 2: Bucket existe
    results.append(("Bucket Existe", test_bucket_exists(s3)))
    
    if not results[-1][1]:
        print("\n❌ TEST FALLIDO: No se puede acceder al bucket")
        sys.exit(1)
    
    # Test 3: CREATE
    test_file = test_create_object(s3)
    results.append(("CREATE", test_file is not None))
    
    if test_file:
        # Test 4: READ
        results.append(("READ", test_read_object(s3, test_file)))
        
        # Test 5: LIST
        results.append(("LIST", test_list_objects(s3)))
        
        # Test 7: URL
        test_public_url(test_file)
        
        # Test 6: DELETE
        results.append(("DELETE", test_delete_object(s3, test_file)))
    
    # Resumen
    print("\n" + "="*60)
    print("📊 RESUMEN DE RESULTADOS")
    print("="*60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {name}: {status}")
    
    print(f"\n  Total: {passed}/{total} tests pasados")
    
    if passed == total:
        print("\n✅ TODOS LOS TESTS PASARON - Bucket configurado correctamente!")
    else:
        print("\n⚠️ ALGUNOS TESTS FALLARON - Revisa la configuración")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
